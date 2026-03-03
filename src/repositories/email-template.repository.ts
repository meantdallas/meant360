import { prisma } from '@/lib/db';

export const emailTemplateRepository = {
  async findAll() {
    return prisma.emailTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
  },

  async findById(id: string) {
    return prisma.emailTemplate.findUnique({ where: { id } });
  },

  async create(data: { name: string; subject: string; body: string }) {
    return prisma.emailTemplate.create({ data });
  },

  async update(id: string, data: { name?: string; subject?: string; body?: string }) {
    return prisma.emailTemplate.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.emailTemplate.delete({ where: { id } });
  },
};
