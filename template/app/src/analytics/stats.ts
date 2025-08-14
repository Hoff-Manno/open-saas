import { type DailyStats } from 'wasp/entities';
import { type DailyStatsJob } from 'wasp/server/jobs';
import Stripe from 'stripe';
import { stripe } from '../payment/stripe/stripeClient';
import { listOrders } from '@lemonsqueezy/lemonsqueezy.js';
import { getDailyPageViews, getSources } from './providers/plausibleAnalyticsUtils';
// import { getDailyPageViews, getSources } from './providers/googleAnalyticsUtils';
import { paymentProcessor } from '../payment/paymentProcessor';
import { SubscriptionStatus } from '../payment/plans';

export type DailyStatsProps = { dailyStats?: DailyStats; weeklyStats?: DailyStats[]; isLoading?: boolean };

export const calculateDailyStats: DailyStatsJob<never, void> = async (_args, context) => {
  const nowUTC = new Date(Date.now());
  nowUTC.setUTCHours(0, 0, 0, 0);

  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  try {
    const yesterdaysStats = await context.entities.DailyStats.findFirst({
      where: {
        date: {
          equals: yesterdayUTC,
        },
      },
    });

    const userCount = await context.entities.User.count({});
    // users can have paid but canceled subscriptions which terminate at the end of the period
    // we don't want to count those users as current paying users
    const paidUserCount = await context.entities.User.count({
      where: {
        subscriptionStatus: SubscriptionStatus.Active,
      },
    });

    let userDelta = userCount;
    let paidUserDelta = paidUserCount;
    if (yesterdaysStats) {
      userDelta -= yesterdaysStats.userCount;
      paidUserDelta -= yesterdaysStats.paidUserCount;
    }

    let totalRevenue;
    switch (paymentProcessor.id) {
      case 'stripe':
        totalRevenue = await fetchTotalStripeRevenue();
        break;
      case 'lemonsqueezy':
        totalRevenue = await fetchTotalLemonSqueezyRevenue();
        break;
      default:
        throw new Error(`Unsupported payment processor: ${paymentProcessor.id}`);
    }

    const { totalViews, prevDayViewsChangePercent } = await getDailyPageViews();

    // Calculate learning metrics
    const learningMetrics = await calculateLearningMetrics(context, nowUTC);

    let dailyStats = await context.entities.DailyStats.findUnique({
      where: {
        date: nowUTC,
      },
    });

    if (!dailyStats) {
      console.log('No daily stat found for today, creating one...');
      dailyStats = await context.entities.DailyStats.create({
        data: {
          date: nowUTC,
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
          ...learningMetrics,
        },
      });
    } else {
      console.log('Daily stat found for today, updating it...');
      dailyStats = await context.entities.DailyStats.update({
        where: {
          id: dailyStats.id,
        },
        data: {
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
          ...learningMetrics,
        },
      });
    }
    const sources = await getSources();

    for (const source of sources) {
      let visitors = source.visitors;
      if (typeof source.visitors !== 'number') {
        visitors = parseInt(source.visitors);
      }
      await context.entities.PageViewSource.upsert({
        where: {
          date_name: {
            date: nowUTC,
            name: source.source,
          },
        },
        create: {
          date: nowUTC,
          name: source.source,
          visitors,
          dailyStatsId: dailyStats.id,
        },
        update: {
          visitors,
        },
      });
    }

    console.table({ dailyStats });
  } catch (error: any) {
    console.error('Error calculating daily stats: ', error);
    await context.entities.Logs.create({
      data: {
        message: `Error calculating daily stats: ${error?.message}`,
        level: 'job-error',
      },
    });
  }
};

async function fetchTotalStripeRevenue() {
  let totalRevenue = 0;
  let params: Stripe.BalanceTransactionListParams = {
    limit: 100,
    // created: {
    //   gte: startTimestamp,
    //   lt: endTimestamp
    // },
    type: 'charge',
  };

  let hasMore = true;
  while (hasMore) {
    const balanceTransactions = await stripe.balanceTransactions.list(params);

    for (const transaction of balanceTransactions.data) {
      if (transaction.type === 'charge') {
        totalRevenue += transaction.amount;
      }
    }

    if (balanceTransactions.has_more) {
      // Set the starting point for the next iteration to the last object fetched
      params.starting_after = balanceTransactions.data[balanceTransactions.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  // Revenue is in cents so we convert to dollars (or your main currency unit)
  return totalRevenue / 100;
}

async function fetchTotalLemonSqueezyRevenue() {
  try {
    let totalRevenue = 0;
    let hasNextPage = true;
    let currentPage = 1;

    while (hasNextPage) {
      const { data: response } = await listOrders({
        filter: {
          storeId: process.env.LEMONSQUEEZY_STORE_ID,
        },
        page: {
          number: currentPage,
          size: 100,
        },
      });

      if (response?.data) {
        for (const order of response.data) {
          totalRevenue += order.attributes.total;
        }
      }

      hasNextPage = !response?.meta?.page.lastPage;
      currentPage++;
    }

    // Revenue is in cents so we convert to dollars (or your main currency unit)
    return totalRevenue / 100;
  } catch (error) {
    console.error('Error fetching Lemon Squeezy revenue:', error);
    throw error;
  }
}

async function calculateLearningMetrics(context: any, nowUTC: Date) {
  try {
    const startOfToday = new Date(nowUTC);
    const endOfToday = new Date(nowUTC);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // Total modules count
    const totalModules = await context.entities.LearningModule.count({});

    // Active modules (modules with activity in the last 7 days)
    const sevenDaysAgo = new Date(nowUTC);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const activeModules = await context.entities.LearningModule.count({
      where: {
        progress: {
          some: {
            lastAccessed: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    });

    // Total learners (users with progress records)
    const totalLearners = await context.entities.User.count({
      where: {
        progress: {
          some: {},
        },
      },
    });

    // Active learners (users with activity in the last 7 days)
    const activeLearners = await context.entities.User.count({
      where: {
        progress: {
          some: {
            lastAccessed: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    });

    // Modules completed today (based on assignment completion)
    const modulesCompletedToday = await context.entities.ModuleAssignment.count({
      where: {
        completedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // Calculate average completion rate
    const totalAssignments = await context.entities.ModuleAssignment.count({});
    const completedAssignments = await context.entities.ModuleAssignment.count({
      where: {
        completedAt: {
          not: null,
        },
      },
    });
    const avgCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Total time spent across all users (in minutes)
    const totalTimeResult = await context.entities.UserProgress.aggregate({
      _sum: {
        timeSpent: true,
      },
    });
    const totalTimeSpentMinutes = totalTimeResult._sum.timeSpent || 0;

    // Average time spent per user
    const avgTimeSpentPerUser = totalLearners > 0 ? totalTimeSpentMinutes / totalLearners : 0;

    return {
      totalModules,
      activeModules,
      totalLearners,
      activeLearners,
      modulesCompletedToday,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100, // Round to 2 decimal places
      totalTimeSpentMinutes,
      avgTimeSpentPerUser: Math.round(avgTimeSpentPerUser * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error('Error calculating learning metrics:', error);
    return {
      totalModules: 0,
      activeModules: 0,
      totalLearners: 0,
      activeLearners: 0,
      modulesCompletedToday: 0,
      avgCompletionRate: 0,
      totalTimeSpentMinutes: 0,
      avgTimeSpentPerUser: 0,
    };
  }
}
