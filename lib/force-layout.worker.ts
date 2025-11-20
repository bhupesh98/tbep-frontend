// workers/force-layout.worker.ts
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force';

interface WorkerNode {
  ID: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface WorkerEdge {
  source: string;
  target: string;
}

interface InitMessage {
  type: 'init';
  nodes: WorkerNode[];
  edges: WorkerEdge[];
  settings: {
    linkDistance: number;
    chargeStrength: number;
    collideRadius: number;
  };
}

interface UpdateSettingsMessage {
  type: 'updateSettings';
  settings: {
    linkDistance: number;
    chargeStrength: number;
    collideRadius: number;
  };
}

interface ControlMessage {
  type: 'start' | 'stop';
}

type WorkerMessage = InitMessage | UpdateSettingsMessage | ControlMessage;

let simulation: Simulation<WorkerNode, SimulationLinkDatum<WorkerNode>> | null = null;
let nodes: WorkerNode[] = [];
let edges: SimulationLinkDatum<WorkerNode>[] = [];

function createSimulation(settings: InitMessage['settings']) {
  simulation = forceSimulation<WorkerNode, SimulationLinkDatum<WorkerNode>>(nodes)
    .force(
      'link',
      forceLink<WorkerNode, SimulationLinkDatum<WorkerNode>>(edges)
        .id(d => d.ID)
        .distance(settings.linkDistance),
    )
    .force('charge', forceManyBody().strength(settings.chargeStrength).theta(0.8))
    .force('collide', forceCollide(settings.collideRadius))
    .on('tick', () => {
      // Send position updates back to main thread
      self.postMessage({
        type: 'tick',
        positions: nodes.map(node => ({
          ID: node.ID,
          x: node.x,
          y: node.y,
        })),
      });
    })
    .on('end', () => {
      self.postMessage({ type: 'end' });
    });
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;

  switch (data.type) {
    case 'init': {
      nodes = data.nodes;
      edges = data.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
      }));

      createSimulation(data.settings);

      // Auto-stop based on node count
      const nodeCount = nodes.length;
      const autoStopDelay = nodeCount > 1000 ? 5000 : nodeCount > 500 ? 10000 : nodeCount > 100 ? 15000 : 30000;

      simulation?.alpha(1).restart();

      setTimeout(() => {
        simulation?.stop();
      }, autoStopDelay);

      break;
    }

    case 'updateSettings':
      if (simulation && edges) {
        simulation.force(
          'link',
          forceLink<WorkerNode, SimulationLinkDatum<WorkerNode>>(edges)
            .id(d => d.ID)
            .distance(data.settings.linkDistance),
        );
        simulation.force('collide', forceCollide(data.settings.collideRadius));
        simulation.force('charge', forceManyBody().strength(data.settings.chargeStrength).theta(0.8));
        simulation.alpha(0.3).restart();
      }
      break;

    case 'start':
      simulation?.alpha(1).restart();
      break;

    case 'stop':
      simulation?.stop();
      break;
  }
};
