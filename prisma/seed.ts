import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import typeDefaults from '../data/general/type_defaults.json' with { type: 'json' }
import groupDefaults from '../data/general/group_defaults.json' with { type: 'json' }
import classDefaults from '../data/general/class_defaults.json' with { type: 'json' }
import clientDefaults from '../data/general/client_defaults.json' with { type: 'json' }

const prisma = new PrismaClient()

async function main() {
  // Step 1: Create default workspace
  console.log('Creating default workspace...')
  const workspace = await prisma.workspace.upsert({
    where: { name: 'Default' },
    update: {},
    create: { name: 'Default' },
  })

  // Step 2: Create users
  console.log('Seeding users...')
  for (const client of clientDefaults) {
    const passwordHash = await bcrypt.hash(client.password, 12)
    const user = await prisma.user.upsert({
      where: { name: client.name },
      update: {},
      create: { name: client.name, passwordHash, type: client.type },
    })

    // Step 3: Link each user to the default workspace as admin
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: {},
      create: { workspaceId: workspace.id, userId: user.id, role: 'admin' },
    })
  }

  // Step 4: Seed transaction types (per workspace)
  console.log('Seeding transaction types...')
  for (const t of typeDefaults) {
    await prisma.transactionType.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: t.name } },
      update: { hidden: t.hidden },
      create: { workspaceId: workspace.id, name: t.name, hidden: t.hidden },
    })
  }

  // Step 5: Seed transaction groups (per workspace)
  console.log('Seeding transaction groups...')
  for (const g of groupDefaults) {
    await prisma.transactionGroup.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: g.name } },
      update: {},
      create: { workspaceId: workspace.id, name: g.name },
    })
  }

  // Step 6: Seed transaction classes and classifier rules (per workspace)
  console.log('Seeding transaction classes and classifier rules...')
  for (const c of classDefaults) {
    const group = await prisma.transactionGroup.findUniqueOrThrow({
      where: { workspaceId_name: { workspaceId: workspace.id, name: c.group } },
    })
    const type = await prisma.transactionType.findUniqueOrThrow({
      where: { workspaceId_name: { workspaceId: workspace.id, name: c.type } },
    })

    const cls = await prisma.transactionClass.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: c.name } },
      update: { groupId: group.id, typeId: type.id },
      create: { workspaceId: workspace.id, name: c.name, groupId: group.id, typeId: type.id },
    })

    for (const rule of c.classifiers) {
      const existing = await prisma.classifierRule.findFirst({
        where: { classId: cls.id, regex: rule.regex },
      })
      if (!existing) {
        await prisma.classifierRule.create({
          data: { classId: cls.id, regex: rule.regex },
        })
      }
    }
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
