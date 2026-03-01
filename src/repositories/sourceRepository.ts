import { prisma } from '@/lib/prisma'

export const sourceRepository = {
  async findAllForWorkspace(workspaceId: string) {
    return prisma.transactionSource.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.transactionSource.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })
  },

  async findByNameAndWorkspace(name: string, workspaceId: string) {
    return prisma.transactionSource.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    })
  },

  async create(data: { name: string; type: string; workspaceId: string }) {
    return prisma.transactionSource.create({ data })
  },

  async findOrCreate(name: string, workspaceId: string): Promise<{ id: string; name: string }> {
    const existing = await prisma.transactionSource.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    })
    if (existing) return existing
    return prisma.transactionSource.create({
      data: { name, type: 'file', workspaceId },
    })
  },
}

export const sourceFileRepository = {
  async findByNameAndWorkspace(name: string, workspaceId: string) {
    return prisma.transactionSourceFile.findUnique({
      where: { workspaceId_name: { workspaceId, name } },
    })
  },

  async upsert(data: { name: string; workspaceId: string; dataHash: string }) {
    return prisma.transactionSourceFile.upsert({
      where: { workspaceId_name: { workspaceId: data.workspaceId, name: data.name } },
      update: { dataHash: data.dataHash },
      create: data,
    })
  },

  async findAllForWorkspace(workspaceId: string) {
    return prisma.transactionSourceFile.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: string) {
    return prisma.transactionSourceFile.findUnique({ where: { id } })
  },
}
