import re

with open('server/src/controllers/ordersController.ts', 'r') as f:
    content = f.read()

def repl_green(m):
    return """greenPrice: {
              $cond: {
                if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                then: { $ifNull: ['$customer.preOctGreenPrice', { $ifNull: ['$customer.greenPrice', 0] }] },
                else: { $ifNull: ['$customer.greenPrice', 0] }
              }
            }"""

def repl_orange(m):
    return """orangePrice: {
              $cond: {
                if: { $lt: ['$date', new Date('2026-10-01T00:00:00.000Z')] },
                then: { $ifNull: ['$customer.preOctOrangePrice', { $ifNull: ['$customer.orangePrice', 0] }] },
                else: { $ifNull: ['$customer.orangePrice', 0] }
              }
            }"""

content = re.sub(r"greenPrice:\s*\{\s*\$ifNull:\s*\['\$customer\.greenPrice',\s*0\]\s*\}", repl_green, content)
content = re.sub(r"orangePrice:\s*\{\s*\$ifNull:\s*\['\$customer\.orangePrice',\s*0\]\s*\}", repl_orange, content)

with open('server/src/controllers/ordersController.ts', 'w') as f:
    f.write(content)
