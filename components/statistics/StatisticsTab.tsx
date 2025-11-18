'use client';
import { DownloadIcon } from 'lucide-react';
import { unparse } from 'papaparse';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  columnTop10ByBetweenness,
  columnTop10ByCloseness,
  columnTop10ByDegree,
  columnTop10ByEigenvector,
  columnTop10ByPageRank,
} from '@/lib/data';
import { useStore } from '@/lib/hooks';
import { downloadFile } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { DataTable } from '../ui/data-table';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const CENTRALITY_CONFIGS = [
  { value: 'degree', label: 'By Degree', dataKey: 'degree', data: 'top10ByDegree', columns: columnTop10ByDegree },
  {
    value: 'betweenness',
    label: 'By Betweenness',
    dataKey: 'betweenness',
    data: 'top10ByBetweenness',
    columns: columnTop10ByBetweenness,
  },
  {
    value: 'closeness',
    label: 'By Closeness',
    dataKey: 'closeness',
    data: 'top10ByCloseness',
    columns: columnTop10ByCloseness,
  },
  {
    value: 'eigenvector',
    label: 'By Eigenvector',
    dataKey: 'eigenvector',
    data: 'top10ByEigenvector',
    columns: columnTop10ByEigenvector,
  },
  {
    value: 'pagerank',
    label: 'By PageRank',
    dataKey: 'pagerank',
    data: 'top10ByPageRank',
    columns: columnTop10ByPageRank,
  },
] as const;

export function StatisticsTab() {
  const networkStatistics = useStore(state => state.networkStatistics);

  const handleDownload = (name: string, data: Record<string, string>[] | null) => {
    if (!data) return;
    const csv = unparse(data);
    downloadFile(csv, `${name}.csv`);
  };

  return (
    <div className='mx-4 my-6 flex flex-col gap-4 pb-6'>
      <h1 className='w-full text-center font-bold text-4xl'>Network Info</h1>
      <div className='grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
        <Card>
          <CardHeader>
            <CardTitle className='pb-4'>Total Nodes</CardTitle>
            <b className='text-4xl'>{networkStatistics.totalNodes.toLocaleString()}</b>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Interactions</CardTitle>
            <b className='text-4xl'>{networkStatistics.totalEdges.toLocaleString()}</b>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Degree</CardTitle>
            <b className='text-4xl'>{networkStatistics.avgDegree.toFixed(1)}</b>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Network Density</CardTitle>
            <b className='text-4xl'>{(networkStatistics.density * 100).toFixed(1)}%</b>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Network Diameter</CardTitle>
            <b className='text-4xl'>{networkStatistics.diameter}</b>
            {Number.POSITIVE_INFINITY === networkStatistics.diameter && (
              <p className='text-xs'>* Since the graph is disconnected</p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clustering Coefficient</CardTitle>
            <b className='text-4xl'>{networkStatistics.averageClusteringCoefficient.toFixed(3)}</b>
            {Number.isNaN(networkStatistics.averageClusteringCoefficient) && (
              <p className='text-xs'>* Not Available for Custom Graphs</p>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Gene Degree Distribution */}
      <Card className='pb-6'>
        <CardHeader>
          <CardTitle>Gene Degree Distribution</CardTitle>
          <CardDescription>Histogram showing the frequency of node degrees</CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center'>
          {networkStatistics.degreeDistribution ? (
            <ChartContainer className='safari-only-svg-fix max-h-[400px] w-full' config={{}}>
              <BarChart data={networkStatistics.degreeDistribution}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='degree'
                  name='Degree'
                  label={{ value: 'Degree', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  dataKey='count'
                  tickCount={7}
                  label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip content={<ChartTooltipContent labelKey='Degree' />} />
                <Bar dataKey='count' fill='hsl(var(--primary))' />
              </BarChart>
            </ChartContainer>
          ) : (
            <Skeleton className='h-[400px] w-full' />
          )}
        </CardContent>
      </Card>

      {/* Top 10 Hub Nodes */}
      <Card className='pb-6'>
        <CardHeader>
          <CardTitle>Top 10 Hub Nodes</CardTitle>
          <CardDescription>Most connected nodes in the network</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='degree'>
            <TabsList className='mb-4 flex w-full'>
              {CENTRALITY_CONFIGS.map(config => (
                <TabsTrigger key={config.value} className='w-full' value={config.value}>
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {CENTRALITY_CONFIGS.map(config => {
              const data = networkStatistics[config.data];
              const hasData = data && data.length > 0;
              return (
                <TabsContent key={config.value} value={config.value}>
                  <Tabs defaultValue='chart'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div className='flex flex-1 justify-end' />
                      <div className='flex justify-center'>
                        <TabsList>
                          <TabsTrigger value='chart'>Chart View</TabsTrigger>
                          <TabsTrigger value='table'>Table View</TabsTrigger>
                        </TabsList>
                      </div>
                      <div className='flex flex-1 justify-end'>
                        <Button
                          variant='outline'
                          size={'icon'}
                          className='hover:bg-muted hover:text-muted-foreground'
                          onClick={() => handleDownload(config.value, data)}
                          disabled={!hasData}
                        >
                          <DownloadIcon className='size-5' />
                        </Button>
                      </div>
                    </div>
                    <TabsContent value='table'>
                      {hasData ? (
                        // biome-ignore lint/suspicious/noExplicitAny: Typescript error
                        <DataTable data={data as any[]} columns={config.columns} />
                      ) : data ? (
                        <div className='flex justify-center text-center text-muted-foreground'>
                          Calculation failed for large graph. Try with a smaller network.
                        </div>
                      ) : (
                        <Skeleton className='h-[400px] w-full' />
                      )}
                    </TabsContent>
                    <TabsContent value='chart'>
                      {hasData ? (
                        <ChartContainer className='safari-only-svg-fix max-h-[400px] w-full' config={{}}>
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis dataKey='geneName' label={{ value: 'Gene', position: 'insideBottom', offset: -5 }} />
                            <YAxis
                              dataKey={config.dataKey}
                              type='number'
                              tickCount={7}
                              label={{ value: config.label.replace('By ', ''), angle: -90, position: 'insideLeft' }}
                            />
                            <ChartTooltip content={<ChartTooltipContent labelKey='Gene' />} />
                            <Bar dataKey={config.dataKey} fill='hsl(var(--primary))' />
                          </BarChart>
                        </ChartContainer>
                      ) : data ? (
                        <div className='flex items-center justify-center'>
                          <p className='text-muted-foreground'>
                            Calculation failed for large graph. Try with a smaller network.
                          </p>
                        </div>
                      ) : (
                        <Skeleton className='h-[400px] w-full' />
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              );
            })}
          </Tabs>
          <p className='text-muted-foreground text-xs'>
            * If 10 nodes are not available, it means the network has less than 10 nodes.
          </p>
        </CardContent>
      </Card>

      {/* Edge Interaction Score Distribution */}
      <Card className='pb-6'>
        <CardHeader>
          <CardTitle>Edge Interaction Score Distribution</CardTitle>
          <CardDescription>
            Cumulative distribution of Interaction edge scores <br /> It shows the number of interactions with a score
            greater than or equal to a certain value.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center'>
          {networkStatistics.edgeScoreDistribution ? (
            <ChartContainer className='safari-only-svg-fix max-h-[400px] w-full' config={{}}>
              <AreaChart data={networkStatistics.edgeScoreDistribution}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='score' label={{ value: 'Interaction Score', position: 'insideBottom', offset: -5 }} />
                <YAxis
                  dataKey='count'
                  tickCount={7}
                  label={{ value: 'Number of Interactions', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip content={<ChartTooltipContent labelKey='Score' />} />
                <Area type='monotone' dataKey='count' stroke='hsl(var(--foreground))' fill='hsl(var(--primary))' />
              </AreaChart>
            </ChartContainer>
          ) : (
            <Skeleton className='h-[400px] w-full' />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
