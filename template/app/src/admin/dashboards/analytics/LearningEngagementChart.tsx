import { ApexOptions } from 'apexcharts';
import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

type EngagementTrend = {
  date: string;
  activeUsers: number;
  timeSpent: number;
  completions: number;
};

type LearningEngagementChartProps = {
  engagementTrends?: EngagementTrend[];
  isLoading?: boolean;
};

const options: ApexOptions = {
  legend: {
    show: false,
    position: 'top',
    horizontalAlign: 'left',
  },
  colors: ['#3C50E0', '#80CAEE', '#10B981'],
  chart: {
    fontFamily: 'Satoshi, sans-serif',
    height: 335,
    type: 'area',
    dropShadow: {
      enabled: true,
      color: '#623CEA14',
      top: 10,
      blur: 4,
      left: 0,
      opacity: 0.1,
    },
    toolbar: {
      show: false,
    },
  },
  responsive: [
    {
      breakpoint: 1024,
      options: {
        chart: {
          height: 300,
        },
      },
    },
    {
      breakpoint: 1366,
      options: {
        chart: {
          height: 350,
        },
      },
    },
  ],
  stroke: {
    width: [2, 2, 2],
    curve: 'straight',
  },
  grid: {
    xaxis: {
      lines: {
        show: true,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  markers: {
    size: 4,
    colors: '#fff',
    strokeColors: ['#3056D3', '#80CAEE', '#10B981'],
    strokeWidth: 3,
    strokeOpacity: 0.9,
    strokeDashArray: 0,
    fillOpacity: 1,
    discrete: [],
    hover: {
      size: undefined,
      sizeOffset: 5,
    },
  },
  xaxis: {
    type: 'category',
    categories: [],
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: [
    {
      title: {
        text: 'Active Users',
        style: {
          fontSize: '12px',
        },
      },
      min: 0,
    },
    {
      opposite: true,
      title: {
        text: 'Time Spent (hours)',
        style: {
          fontSize: '12px',
        },
      },
      min: 0,
    },
    {
      opposite: true,
      title: {
        text: 'Completions',
        style: {
          fontSize: '12px',
        },
      },
      min: 0,
      show: false,
    },
  ],
};

interface ChartState {
  series: Array<{
    name: string;
    data: number[];
    yAxisIndex?: number;
  }>;
}

const LearningEngagementChart = ({ engagementTrends = [], isLoading }: LearningEngagementChartProps) => {
  const datesArray = useMemo(() => {
    return engagementTrends.map((trend) => {
      const date = new Date(trend.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }, [engagementTrends]);

  const [state, setState] = useState<ChartState>({
    series: [
      {
        name: 'Active Users',
        data: [],
        yAxisIndex: 0,
      },
      {
        name: 'Time Spent (hours)',
        data: [],
        yAxisIndex: 1,
      },
      {
        name: 'Completions',
        data: [],
        yAxisIndex: 2,
      },
    ],
  });

  const [chartOptions, setChartOptions] = useState<ApexOptions>(options);

  useEffect(() => {
    if (engagementTrends.length > 0) {
      const activeUsersData = engagementTrends.map((trend) => trend.activeUsers);
      const timeSpentData = engagementTrends.map((trend) => Math.round(trend.timeSpent / 60)); // Convert minutes to hours
      const completionsData = engagementTrends.map((trend) => trend.completions);

      setState({
        series: [
          {
            name: 'Active Users',
            data: activeUsersData,
            yAxisIndex: 0,
          },
          {
            name: 'Time Spent (hours)',
            data: timeSpentData,
            yAxisIndex: 1,
          },
          {
            name: 'Completions',
            data: completionsData,
            yAxisIndex: 2,
          },
        ],
      });

      setChartOptions({
        ...options,
        xaxis: {
          ...options.xaxis,
          categories: datesArray,
        },
        yaxis: [
          {
            ...(Array.isArray(options.yaxis) ? options.yaxis[0] : options.yaxis),
            max: Math.max(...activeUsersData) * 1.2 || 10,
          },
          {
            ...(Array.isArray(options.yaxis) ? options.yaxis[1] : options.yaxis),
            max: Math.max(...timeSpentData) * 1.2 || 10,
          },
          {
            ...(Array.isArray(options.yaxis) ? options.yaxis[2] : options.yaxis),
            max: Math.max(...completionsData) * 1.2 || 10,
          },
        ],
      });
    }
  }, [engagementTrends, datesArray]);

  return (
    <div className='col-span-12 rounded-sm border border-border bg-card px-5 pt-7.5 pb-5 shadow-default sm:px-7.5 xl:col-span-8'>
      <div className='flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap'>
        <div className='flex w-full flex-wrap gap-3 sm:gap-5'>
          <div className='flex min-w-47.5'>
            <span className='mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-primary'>
              <span className='block h-2.5 w-full max-w-2.5 rounded-full bg-primary'></span>
            </span>
            <div className='w-full'>
              <p className='font-semibold text-primary'>Active Users</p>
              <p className='text-sm font-medium text-muted-foreground'>Last 30 Days</p>
            </div>
          </div>
          <div className='flex min-w-47.5'>
            <span className='mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-secondary'>
              <span className='block h-2.5 w-full max-w-2.5 rounded-full bg-secondary'></span>
            </span>
            <div className='w-full'>
              <p className='font-semibold text-secondary'>Time Spent</p>
              <p className='text-sm font-medium text-muted-foreground'>Hours per day</p>
            </div>
          </div>
          <div className='flex min-w-47.5'>
            <span className='mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-green-500'>
              <span className='block h-2.5 w-full max-w-2.5 rounded-full bg-green-500'></span>
            </span>
            <div className='w-full'>
              <p className='font-semibold text-green-500'>Completions</p>
              <p className='text-sm font-medium text-muted-foreground'>Modules completed</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div id='learningEngagementChart' className='-ml-5'>
          <ReactApexChart options={chartOptions} series={state.series} type='area' height={350} width={'100%'} />
        </div>
      </div>
    </div>
  );
};

export default LearningEngagementChart;
