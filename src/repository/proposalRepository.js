const prisma = require("../lib/prisma");

async function create(proposalData, offeredItemIds) {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.create({
      data: {
        message: proposalData.message,
        proposerId: proposalData.proposerId,
        targetItemId: proposalData.targetItemId,
        statusId: proposalData.statusId,
        offeredItems: {
          create: offeredItemIds.map((itemId) => ({
            item: {
              connect: {
                id: itemId,
              },
            },
          })),
        },
      },
    });

    return proposal;
  });
}

// Função responsável por visualizar as propostas feitas(made) pelo current user
async function findUserProposals(userId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        proposerId: userId,
      },
      skip: offset,
      take: limit,
      include: {
        offeredItems: {
          include: {
            item: {
              select: {
                id: true,
                item_name: true,
                image_url: true,
                condition: true,
                description: true,
              },
            },
          },
        },
        targetItem: {
          select: {
            id: true,
            item_name: true,
            description: true,
            image_url: true,
            condition: {
              select: {
                name: true,
                slug: true,
              },
            },
            user: {
              select: {
                name: true,
                city: true,
                state: true,
              },
            },
          },
        },
        status: {
          select: {
            status_name: true,
          },
        },
        proposer: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    }),
    prisma.proposal.count({
      where: {
        proposerId: userId,
      },
    }),
  ]);
  return {
    proposals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function findUserReceivedProposals(userId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        targetItem: {
          userId: userId,
        },
      },
      skip: offset,
      take: limit,
      include: {
        proposer: {
          select: {
            id: true,
            name: true,
          },
        },
        targetItem: {
          select: {
            id: true,
            item_name: true,
            image_url: true,
            condition: {
              select: {
                name: true,
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

          },
        },
        offeredItems: {
          include: {
            item: {
              select: {
                id: true,
                item_name: true,
                image_url: true,
                condition: true,
              },
            },
          },
        },
        status: {
          select: {
            status_name: true,
          },
        },
      },
    }),
    prisma.proposal.count({
      where: {
        targetItem: {
          userId: userId,
        },
      },
    }),
  ]);

  return {
    proposals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function findProposalByTargetIdAndProposerId(targetItemId, proposerId) {
  return prisma.proposal.findFirst({
    where: {
      targetItemId: targetItemId,
      proposerId: proposerId,
    },
  });
}

// função referente a remoção de alguma proposta
async function deleteProposalById(id, proposerId) {
  // Cria uma transação garantindo que todos os comandos só serão executados se juntos
  return prisma.$transaction(async (tx) => {
    // deleta o offeredItem dependente da proposta a ser deletada
    await tx.ProposalOfferedItems.deleteMany({
      where: {
        proposalId: id,
      },
    });

    // executa o deletemany quando o id da proposta e do proposer forem iguais a algum do banco de dados
    const deleted = await tx.Proposal.deleteMany({
      where: {
        id: id,
        proposerId: proposerId,
      },
    });

    return deleted;
  });
}

async function updateProposalById(id, proposerId, updateProposal) {
  return prisma.proposal.updateMany({
    where: {
      id,
      proposerId, // Garante que só o dono possa atualizar
    },
    data: updateProposal,
  });
}

async function updateStatus(id, statusId, tx) {
  const db = tx || prisma;
  return db.proposal.update({
    where: { id },
    data: {
      statusId,
    },
  });
}

async function findByIdWithItems(proposalId) {
  return prisma.proposal.findUnique({
    where: {
      id: proposalId,
    },
    include: {
      targetItem: {
        select: {
          userId: true,
        },
      },
      offeredItems: {
        select: {
          itemId: true,
        },
      },
    },
  });
}

module.exports = {
  create,
  findUserProposals,
  findUserReceivedProposals,
  findProposalByTargetIdAndProposerId,
  deleteProposalById,
  updateProposalById,
  updateStatus,
  findByIdWithItems,
};
