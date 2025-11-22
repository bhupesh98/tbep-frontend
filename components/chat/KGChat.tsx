'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { BookmarkIcon, CheckIcon, RefreshCcwIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { LLM_MODELS } from '@/lib/data';
import { useStore } from '@/lib/hooks';
import { useKGStore } from '@/lib/hooks/use-kg-store';
import type { KGUIMessage } from '@/lib/kg-chat-types';
import { buildNodeSearchIndex, buildPropertySearchIndex, KG_TOOLS, type ToolContext } from '@/lib/kg-tools';
import { generateSessionId, getUserId } from '@/lib/langfuse-tracking';
import { cn, envURL } from '@/lib/utils';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '../ai-elements/checkpoint';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai-elements/conversation';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageAvatar,
  MessageContent,
  MessageCopyAction,
  MessageResponse,
} from '../ai-elements/message';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '../ai-elements/model-selector';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '../ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../ai-elements/reasoning';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '../ai-elements/tool';

type CheckpointType = {
  id: string;
  messageIndex: number;
  timestamp: Date;
  messageCount: number;
};

export interface KGChatProps {
  onChatOpen?: (isOpen: boolean) => void;
  children?: (props: KGChatRenderProps) => React.ReactNode;
}

export interface KGChatRenderProps {
  // State
  model: string;

  // Chat data
  messages: ReturnType<typeof useChat>['messages'];
  status: ReturnType<typeof useChat>['status'];
  checkpoints: CheckpointType[];

  // Handlers
  handleSubmit: (message: PromptInputMessage) => Promise<void>;
  handleDeleteMessages: () => void;
  handleSubmitAction: () => void;
  setModel: (model: (typeof LLM_MODELS)[number]['id']) => void;
  regenerate: () => void;
  createCheckpoint: (messageIndex: number) => void;
  restoreToCheckpoint: (messageIndex: number) => void;

  // Components
  renderMessages: (alert?: { component: React.ReactNode; show: boolean }) => React.ReactNode;
  renderPromptInput: () => React.ReactNode;
}

/**
 * KGChat Component
 * Knowledge Graph-aware chat with client-side tool execution
 *
 * Key differences from ChatBase:
 * - Uses /kg-chat endpoint instead of /llm
 * - Implements onToolCall for client-side tool execution
 * - Builds graph context and property search index on mount
 * - Renders tool results inline with messages
 */
export function KGChat({ onChatOpen, children }: KGChatProps) {
  const [model, setModel] = React.useState<(typeof LLM_MODELS)[number]['id']>(LLM_MODELS[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = React.useState(false);
  const [checkpoints, setCheckpoints] = React.useState<CheckpointType[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Generate unique IDs for Langfuse session tracking
  const sessionId = React.useMemo(() => generateSessionId(), []);

  const { messages, setMessages, sendMessage, status, regenerate, stop, clearError, addToolOutput } =
    useChat<KGUIMessage>({
      transport: new DefaultChatTransport({
        api: `${envURL(process.env.NEXT_PUBLIC_LLM_BACKEND_URL)}/kg-chat`,
      }),
      onError(error) {
        toast.error('Failed to fetch response from LLM', {
          cancel: { label: 'Close', onClick() {} },
          description: error.message || 'LLM server is not responding. Please try again later.',
        });
      },
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      async onToolCall({ toolCall }) {
        // Type narrowing: Skip dynamic tools (not supported in our registry)
        if (toolCall.dynamic) {
          return;
        }

        // CRITICAL: Build indexes fresh on each tool call to capture latest state
        // This ensures we always use the most up-to-date sigmaInstance, kgPropertyOptions, and radioOptions
        // which may have been loaded/updated after the component mounted
        const currentSigmaInstance = useKGStore.getState().sigmaInstance;
        const currentKgPropertyOptions = useKGStore.getState().kgPropertyOptions;
        const currentRadioOptions = useStore.getState().radioOptions;

        if (!currentSigmaInstance) {
          throw new Error('Graph not loaded. Please upload or load a knowledge graph first.');
        }

        const graph = currentSigmaInstance.getGraph();

        // Build fresh indexes with latest data
        const graphSearchIndex = buildNodeSearchIndex(graph);
        const propertySearchIndex = buildPropertySearchIndex(currentKgPropertyOptions || {}, currentRadioOptions);

        // Build tool context with fresh indexes
        const toolContext: ToolContext = {
          store: useKGStore.getState(),
          legacy_store: useStore.getState(),
          graphSearchIndex,
          propertySearchIndex,
        };

        try {
          // Get tool function from registry
          const toolFn = KG_TOOLS[toolCall.toolName as keyof typeof KG_TOOLS];

          if (!toolFn) {
            throw new Error(`Tool '${toolCall.toolName}' not found in registry`);
          }

          // Execute tool with input and context
          // NOTE: TypeScript cannot statically verify the relationship between toolCall.toolName
          // and the correct input type because KG_TOOLS is a heterogeneous registry (each tool
          // has different input/output types). Runtime safety is guaranteed by:
          // 1. AI SDK validates toolCall.input against zod schemas before this callback
          // 2. Tool implementations validate their inputs and return typed ToolResult<T>
          // biome-ignore lint/suspicious/noExplicitAny: TypeScript limitation with heterogeneous tool registry, runtime type safety via zod
          const result = await toolFn(toolCall.input as any, toolContext);

          // Check if tool execution was successful
          if (!result.success) {
            throw new Error(result.error || 'Tool execution failed');
          }

          // Add successful output to chat (only the data, not the wrapper)
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            // biome-ignore lint/suspicious/noExplicitAny: Output type matches the tool's return type, AI SDK handles downstream typing
            output: result.data as any,
          });

          // Apply visual updates if tool returned them
          if (result.visualUpdate) {
            const { visualUpdate } = result;

            // Highlight nodes
            if (visualUpdate.highlightedNodes) {
              for (const nodeId of visualUpdate.highlightedNodes) {
                if (graph.hasNode(nodeId)) {
                  graph.updateNodeAttributes(nodeId, attrs => {
                    attrs.highlighted = true;
                    attrs.zIndex = 100;
                    return attrs;
                  });
                }
              }
            }

            // Highlight edges
            if (visualUpdate.highlightedEdges) {
              for (const edgeId of visualUpdate.highlightedEdges) {
                if (graph.hasEdge(edgeId)) {
                  graph.updateEdgeAttributes(edgeId, attrs => {
                    attrs.highlighted = true;
                    attrs.zIndex = 100;
                    return attrs;
                  });
                }
              }
            }

            // Animate camera to target
            if (visualUpdate.cameraTarget) {
              const camera = currentSigmaInstance.getCamera();
              camera.animate(
                {
                  x: visualUpdate.cameraTarget.x,
                  y: visualUpdate.cameraTarget.y,
                  ratio: visualUpdate.cameraTarget.ratio || 0.5,
                },
                { duration: 500 },
              );
            }

            // Refresh sigma to apply visual changes
            currentSigmaInstance.refresh();
          }
        } catch (error) {
          // Handle errors gracefully - show error toast
          const errorText = error instanceof Error ? error.message : String(error);
          toast.error('Tool execution failed', {
            description: errorText,
            cancel: { label: 'Close', onClick() {} },
          });

          // Also add error output to chat for context
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            state: 'output-error',
            errorText,
          });
        }
      },
    });

  // Checkpoint management functions
  const createCheckpoint = React.useCallback((messageIndex: number) => {
    const checkpoint: CheckpointType = {
      id: `checkpoint-${Date.now()}-${messageIndex}`,
      messageIndex,
      timestamp: new Date(),
      messageCount: messageIndex + 1,
    };
    setCheckpoints(prev => [...prev, checkpoint]);
  }, []);

  const restoreToCheckpoint = React.useCallback(
    (messageIndex: number) => {
      // Restore messages to checkpoint state
      setMessages(messages.slice(0, messageIndex + 1));
      // Remove checkpoints after this point
      setCheckpoints(prev => prev.filter(cp => cp.messageIndex <= messageIndex));
      toast.success('Checkpoint restored', {
        description: `Conversation restored to ${messageIndex + 1} messages`,
      });
    },
    [messages, setMessages],
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    onChatOpen?.(true);
    sendMessage(
      { text: message.text, files: message.files },
      {
        body: {
          model,
          sessionId,
          userId: getUserId(),
        },
      },
    );
  };

  const handleDeleteMessages = () => {
    setMessages([]);
    setCheckpoints([]);
    onChatOpen?.(false);
  };

  const handleSubmitAction = () => {
    if (status === 'submitted' || status === 'streaming') {
      stop();
    } else if (status === 'error') {
      setMessages(messages.slice(0, -1));
      clearError();
    }
  };

  const renderMessages = (alert?: { component: React.ReactNode; show: boolean }) => (
    <Conversation className='h-full'>
      <ConversationContent>
        {messages.map((message, messageIndex) => {
          const checkpoint = checkpoints.find(cp => cp.messageIndex === messageIndex);
          const hasAttachments = message.parts.some(part => part.type === 'file');

          return (
            <React.Fragment key={message.id}>
              <div className='fade-in slide-in-from-bottom-10 animate-in duration-300'>
                {/* Render attachments if present */}
                {hasAttachments && (
                  <MessageAttachments className='mb-2'>
                    {message.parts
                      .filter(part => part.type === 'file')
                      .map((part, i) => (
                        <MessageAttachment key={`${message.id}-attachment-${i}`} data={part} />
                      ))}
                  </MessageAttachments>
                )}

                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <React.Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent className='shadow-md'>
                              <MessageResponse isAnimating={status === 'submitted' && message.role === 'assistant'}>
                                {part.text}
                              </MessageResponse>
                            </MessageContent>
                            <MessageAvatar
                              className={cn('shadow', message.role === 'assistant' && 'p-1')}
                              src={message.role === 'user' ? '/image/user.png' : '/image/logo.svg'}
                              name={message.role === 'user' ? 'You' : 'AI'}
                            />
                          </Message>
                          {message.role === 'assistant' && (
                            <MessageActions className='-mt-2 pl-10'>
                              {messages.length - 1 === messageIndex && (
                                <MessageAction onClick={() => regenerate()} label='Retry'>
                                  <RefreshCcwIcon className='size-3' />
                                </MessageAction>
                              )}
                              <MessageCopyAction text={part.text} />
                              {!checkpoint && (
                                <MessageAction
                                  onClick={() => createCheckpoint(messageIndex)}
                                  label='Checkpoint'
                                  tooltip='Save this point'
                                >
                                  <BookmarkIcon className='size-3' />
                                </MessageAction>
                              )}
                            </MessageActions>
                          )}
                        </React.Fragment>
                      );
                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className='w-full'
                          isStreaming={
                            status === 'streaming' &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent className='rounded-md border p-2 text-black'>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    case 'file':
                      // Files are rendered separately above
                      return null;
                    default:
                      // Tool-related parts (includes both 'dynamic-tool' and 'tool-*' types)
                      if (
                        (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) &&
                        'state' in part &&
                        'input' in part
                      ) {
                        // biome-ignore lint/suspicious/noExplicitAny: Tool part types are complex unions from AI SDK
                        const toolPart = part as any;
                        const toolName =
                          part.type === 'dynamic-tool' ? toolPart.toolName : part.type.replace('tool-', '');

                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen>
                            {/* biome-ignore lint/suspicious/noExplicitAny: ToolUIPart type union requires type assertion for compatibility */}
                            <ToolHeader title={toolName} type={part.type as any} state={toolPart.state} />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              <ToolOutput output={toolPart.output} errorText={toolPart.errorText} />
                            </ToolContent>
                          </Tool>
                        );
                      }
                      return null;
                  }
                })}
              </div>

              {/* Render checkpoint if it exists at this message */}
              {checkpoint && (
                <Checkpoint className='my-4'>
                  <CheckpointIcon />
                  <CheckpointTrigger onClick={() => restoreToCheckpoint(checkpoint.messageIndex)}>
                    Restore checkpoint ({checkpoint.messageCount} messages)
                  </CheckpointTrigger>
                </Checkpoint>
              )}
            </React.Fragment>
          );
        })}
        {alert?.show && alert?.component}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );

  const renderPromptInput = () => {
    // Get the selected model data for display
    const selectedModelData = LLM_MODELS.find(m => m.id === model);

    return (
      <PromptInputProvider>
        <PromptInput globalDrop multiple onSubmit={handleSubmit} className='mx-2'>
          <PromptInputAttachments>{attachment => <PromptInputAttachment data={attachment} />}</PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea ref={textareaRef} disabled={status === 'error'} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputSpeechButton textareaRef={textareaRef} />
              <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && <ModelSelectorLogo provider={selectedModelData.chefSlug} />}
                    {selectedModelData && <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder='Search models...' />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {['OpenAI', 'DeepSeek AI', 'Meta'].map(chef => (
                      <ModelSelectorGroup heading={chef} key={chef}>
                        {LLM_MODELS.filter(m => m.chef === chef).map(m => (
                          <ModelSelectorItem
                            key={m.id}
                            onSelect={() => {
                              setModel(m.id);
                              setModelSelectorOpen(false);
                            }}
                            value={m.id}
                          >
                            <ModelSelectorLogo provider={m.chefSlug} />
                            <ModelSelectorName>{m.name}</ModelSelectorName>
                            <ModelSelectorLogoGroup>
                              {m.providers.map(provider => (
                                <ModelSelectorLogo key={provider} provider={provider} />
                              ))}
                            </ModelSelectorLogoGroup>
                            {model === m.id ? (
                              <CheckIcon className='ml-auto size-4' />
                            ) : (
                              <div className='ml-auto size-4' />
                            )}
                          </ModelSelectorItem>
                        ))}
                      </ModelSelectorGroup>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={status} onClick={handleSubmitAction} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    );
  };

  if (children) {
    return (
      <>
        {children({
          model,
          messages,
          status,
          checkpoints,
          handleSubmit,
          handleDeleteMessages,
          handleSubmitAction,
          setModel,
          regenerate,
          createCheckpoint,
          restoreToCheckpoint,
          renderMessages,
          renderPromptInput,
        })}
      </>
    );
  }

  return null;
}
