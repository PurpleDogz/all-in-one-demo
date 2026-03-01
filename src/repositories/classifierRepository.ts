import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const classifierRepository = {
  async findAll(workspaceId: string, classId?: string) {
    return prisma.classifierRule.findMany({
      where: {
        class: { workspaceId },
        ...(classId ? { classId } : {}),
      },
      include: { class: { include: { group: true, type: true } } },
      orderBy: [{ class: { name: 'asc' } }, { id: 'asc' }],
    })
  },

  async findAllRaw(workspaceId: string) {
    return prisma.classifierRule.findMany({
      where: { class: { workspaceId } },
      orderBy: { id: 'asc' },
    })
  },

  async findById(id: string) {
    return prisma.classifierRule.findUnique({
      where: { id },
      include: { class: { include: { group: true, type: true } } },
    })
  },

  async create(data: {
    classId: string
    regex: string
    value?: string | null
    valueMin?: string | null
    valueMax?: string | null
    date?: string | null
  }) {
    return prisma.classifierRule.create({
      data: {
        classId: data.classId,
        regex: data.regex,
        value: data.value ? new Prisma.Decimal(data.value) : null,
        valueMin: data.valueMin ? new Prisma.Decimal(data.valueMin) : null,
        valueMax: data.valueMax ? new Prisma.Decimal(data.valueMax) : null,
        date: data.date ?? null,
      },
      include: { class: { include: { group: true, type: true } } },
    })
  },

  async update(
    id: string,
    data: {
      classId?: string
      regex?: string
      value?: string | null
      valueMin?: string | null
      valueMax?: string | null
      date?: string | null
    },
  ) {
    return prisma.classifierRule.update({
      where: { id },
      data: {
        ...(data.classId !== undefined ? { classId: data.classId } : {}),
        ...(data.regex !== undefined ? { regex: data.regex } : {}),
        ...(data.value !== undefined
          ? { value: data.value ? new Prisma.Decimal(data.value) : null }
          : {}),
        ...(data.valueMin !== undefined
          ? { valueMin: data.valueMin ? new Prisma.Decimal(data.valueMin) : null }
          : {}),
        ...(data.valueMax !== undefined
          ? { valueMax: data.valueMax ? new Prisma.Decimal(data.valueMax) : null }
          : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
      },
      include: { class: { include: { group: true, type: true } } },
    })
  },

  async delete(id: string) {
    return prisma.classifierRule.delete({ where: { id } })
  },
}
