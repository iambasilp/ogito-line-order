const mongoose = require('mongoose');
const Order = require('./models/Order').default;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ogito').then(async () => {
  const result = await Order.aggregate([
    {
      $facet: {
        summary: [
          { $match: { isCancelled: { $ne: true } } }, 
          {
            $group: {
              _id: null,
              billedOrdersCount: {
                $sum: {
                  $cond: [{ $eq: ['$billed', true] }, 1, 0]
                }
              },
              pendingOrdersCount: {
                $sum: {
                  $cond: [{ $ne: ['$billed', true] }, 1, 0]
                }
              }
            }
          }
        ]
      }
    }
  ]);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(console.error);
