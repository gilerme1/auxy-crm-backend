import { PrismaService } from './prisma.service';

describe('PrismaService.softDelete', () => {
  it('marks record inactive and sets deletedAt timestamp', async () => {
    const prisma = new PrismaService();
    const update = jest.fn().mockResolvedValue({ id: 'empresa-1' });

    await prisma.softDelete({ update } as any, 'empresa-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'empresa-1' },
      data: {
        isActive: false,
        deletedAt: expect.any(Date),
      },
    });
  });
});
