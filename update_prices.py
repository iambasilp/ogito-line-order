import re

with open('server/src/controllers/ordersController.ts', 'r') as f:
    content = f.read()

replacement = """greenPrice: {
              $cond: {
                if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                then: { $ifNull: ['$customer.preOctGreenPrice', { $ifNull: ['$customer.greenPrice', 0] }] },
                else: { $ifNull: ['$customer.greenPrice', 0] }
              }
            },
            orangePrice: {
              $cond: {
                if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                then: { $ifNull: ['$customer.preOctOrangePrice', { $ifNull: ['$customer.orangePrice', 0] }] },
                else: { $ifNull: ['$customer.orangePrice', 0] }
              }
            },
            locationUrl: { $ifNull: ['$customer.locationUrl', ''] },
            route: { $ifNull: ['$routeDoc.name', 'Unknown'] },
            deliveredAt: { $ifNull: ['$deliveredAt', null] },
            standardTotal: {
              $multiply: [
                '$standardQty',
                {
                  $cond: {
                    if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                    then: { $ifNull: ['$customer.preOctGreenPrice', { $ifNull: ['$customer.greenPrice', 0] }] },
                    else: { $ifNull: ['$customer.greenPrice', 0] }
                  }
                }
              ]
            },
            premiumTotal: {
              $multiply: [
                '$premiumQty',
                {
                  $cond: {
                    if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                    then: { $ifNull: ['$customer.preOctOrangePrice', { $ifNull: ['$customer.orangePrice', 0] }] },
                    else: { $ifNull: ['$customer.orangePrice', 0] }
                  }
                }
              ]
            }"""

pattern = r"greenPrice:\s*\{\s*\$ifNull:\s*\['\$customer\.greenPrice',\s*0\]\s*\},[\s\n]*orangePrice:\s*\{\s*\$ifNull:\s*\['\$customer\.orangePrice',\s*0\]\s*\},[\s\n]*locationUrl:\s*\{\s*\$ifNull:\s*\['\$customer\.locationUrl',\s*''\]\s*\},[\s\n]*route:\s*\{\s*\$ifNull:\s*\['\$routeDoc\.name',\s*'Unknown'\]\s*\},[\s\n]*deliveredAt:\s*\{\s*\$ifNull:\s*\['\$deliveredAt',\s*null\]\s*\},[\s\n]*standardTotal:\s*\{[\s\n]*\$multiply:\s*\['\$standardQty',\s*\{\s*\$ifNull:\s*\['\$customer\.greenPrice',\s*0\]\s*\}\][\s\n]*\},[\s\n]*premiumTotal:\s*\{[\s\n]*\$multiply:\s*\['\$premiumQty',\s*\{\s*\$ifNull:\s*\['\$customer\.orangePrice',\s*0\]\s*\}\][\s\n]*\}"

content = re.sub(pattern, replacement, content)

with open('server/src/controllers/ordersController.ts', 'w') as f:
    f.write(content)

