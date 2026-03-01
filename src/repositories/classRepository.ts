import { prisma } from '@/lib/prisma'

export const classRepository = {
  async findAll(filters: { workspaceId: string; typeId?: string; groupId?: string }) {
    return prisma.transactionClass.findMany({
      where: {
        workspaceId: filters.workspaceId,
        ...(filters.typeId ? { typeId: filters.typeId } : {}),
        ...(filters.groupId ? { groupId: filters.groupId } : {}),
      },
      include: { group: true, type: true },
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.transactionClass.findUnique({
      where: { id },
      include: { group: true, type: true },
    })
  },

  async findByName(name: string, workspaceId: string) {
    return prisma.transactionClass.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
      include: { group: true, type: true },
    })
  },

  async findUndefinedClasses(workspaceId: string) {
    const [debit, credit] = await Promise.all([
      prisma.transactionClass.findFirstOrThrow({ where: { workspaceId, name: 'Undefined Debit' } }),
      prisma.transactionClass.findFirstOrThrow({ where: { workspaceId, name: 'Undefined Credit' } }),
    ])
    return { debit, credit }
  },
}

export const groupRepository = {
  async findAll(filters: { workspaceId: string; typeId?: string }) {
    return prisma.transactionGroup.findMany({
      where: {
        workspaceId: filters.workspaceId,
        ...(filters.typeId ? { classes: { some: { typeId: filters.typeId } } } : {}),
      },
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.transactionGroup.findUnique({ where: { id } })
  },

  async findByName(name: string, workspaceId: string) {
    return prisma.transactionGroup.findUnique({ where: { workspaceId_name: { workspaceId, name } } })
  },
}

export const typeRepository = {
  async findAll(workspaceId: string) {
    return prisma.transactionType.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    })
  },

  async findByName(name: string, workspaceId: string) {
    return prisma.transactionType.findUnique({ where: { workspaceId_name: { workspaceId, name } } })
  },
}
