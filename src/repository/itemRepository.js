const prisma = require("../lib/prisma");

async function findAllItems(where, page = 1, limit = 10, orderBy) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.items.findMany({
      skip: skip,
      take: limit,
      orderBy: orderBy,
      select: {
        id: true,
        item_name: true,
        description: true,
        image_url: true,
        image_public_id: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
        condition: {
          select: {
            name: true,
            slug: true,
          },
        },
        status: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.items.count({
      where,
    }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function create(itemData, categoryIds) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.items.create({
      data: {
        item_name: itemData.name,
        description: itemData.description,
        image_url: itemData.image_url,
        image_public_id: itemData.image_public_id,
        userId: itemData.userId,
        conditionId: itemData.conditionId,
        statusId: itemData.statusId,
        categories: {
          create: categoryIds.map((catId) => ({
            category: {
              connect: {
                id: catId,
              },
            },
          })),
        },
      },
    });

    return item;
  });
}

async function deleteItem(itemId) {
  return prisma.items.delete({
    where: { id: itemId },
  });
}

async function findUnique(where = {}, include = {}) {
  return prisma.items.findUnique({
    where: where,
    include: include,
  });
}

async function updateItem(itemId, itemData, categoryIds) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.items.update({
      where: { id: itemId },
      data: {
        item_name: itemData.name,
        description: itemData.description,
        image_url: itemData.image_url,
        image_public_id: itemData.imageId,
        userId: itemData.userId,
        conditionId: itemData.conditionId,
        statusId: itemData.statusId,

        categories: {
          deleteMany: {},
          create: categoryIds.map((catId) => ({
            category: {
              connect: {
                id: catId,
              },
            },
          })),
        },
      },
    });

    return item;
  });
}

async function updateStatus(itemId, statusId, tx) {
  const db = tx || prisma;
  return db.items.update({
    where: { id: itemId },
    data: {
      statusId: statusId,
    },
  });
}

async function findById(itemId) {
  return prisma.items.findUnique({
    where: { id: itemId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
      condition: {
        select: {
          name: true, // Apenas o nome da condição
        },
      },
      status: {
        select: {
          name: true, // Apenas o nome do status
        },
      },
      categories: {
        select: {
          category: {
            select: { 
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

async function findItemsByUserId(userId, page, limit) {
  return prisma.items.findMany({
    where: { userId: userId },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      status: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      condition: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });
}

module.exports = {
  create,
  findAllItems,
  deleteItem,
  findUnique,
  updateItem,
  updateStatus,
  findById,
  findItemsByUserId,
};
