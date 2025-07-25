const prisma = require("../lib/prisma");
const proposalRepository = require("../repository/proposalRepository");
const itemRepository = require("../repository/itemRepository");
const itemService = require("./itemService");
const {
  itemStatusRepository,
  proposalStatusRepository,
} = require("../repository/statusRepository");
const { emailQueue } = require("../config/queue");

/**
 * @typedef {Object} ProposalService
 * @property {Function} createProposal - Cria uma nova proposta.
 * @property {Function} findUserProposals - Encontra propostas feitas pelo usuário.
 * @property {Function} findProposalsReceived - Encontra propostas recebidas pelo usuário.
 * @property {Function} deleteProposal - Deleta uma proposta.
 * @property {Function} updateProposal - Atualiza uma proposta.
 * @property {Function} acceptProposal - Aceita uma proposta.
 * @property {Function} declineProposal - Recusa uma proposta.
 */

async function createProposal(proposalData, offeredItemIds, proposerId) {
  const { message, targetItemId } = proposalData;

  const defaultStatusId = await proposalStatusRepository.findByName("Pendente");
  if (!defaultStatusId) {
    throw new Error("Status padrão 'Pendente' não encontrado.");
  }

  console.log('offeredItemIds:', offeredItemIds);

  // Validar se offeredItemIds é um array
  if (!Array.isArray(offeredItemIds) || offeredItemIds.length === 0) {
    throw new Error("Deve fornecer pelo menos um item para oferecer.");
  }

  if (!targetItemId) {
    throw new Error("ID do item alvo não fornecido.");
  }

  if (!message || message.trim() === "") {
    throw new Error("Mensagem não fornecida.");
  }

  // Verifica se todos os itens oferecidos pertencem ao usuario logado
  const offeredItems = await prisma.items.findMany({
    where: {
      id: { in: offeredItemIds },
      userId: proposerId,
    },
  });

  if (offeredItems.length !== offeredItemIds.length) {
    throw new Error(
      "Nem todos os itens oferecidos pertencem ao usuário logado."
    );
  }

  const targetItem = await prisma.items.findUnique({
    where: { id: targetItemId },
    select: { userId: true, item_name: true },
  });

  console.log("Target Item:", targetItem);

  if (!targetItem) {
    throw new Error("Item alvo não encontrado.");
  }

  if (targetItem.userId === proposerId) {
    throw new Error("Você não pode fazer proposta para seu próprio item.");
  }

  // Verifica se já existe a proposta desse user para esse item
  const existingProposal =
    await proposalRepository.findProposalByTargetIdAndProposerId(
      targetItemId,
      proposerId
    );
  //se a proposta existir vai aparecer essa mensagem
  if (existingProposal) {
    throw new Error(
      "Já existe uma proposta para este item alvo por este usuário."
    );
  }

  const negotiatingStatus = await itemStatusRepository.findByName("Em negociação");


  const itemsToUpdate = [targetItemId, ...offeredItemIds].map((itemId) =>
    itemService.updateStatus(itemId, negotiatingStatus.id)
  );


  // Atualiza o status dos itens oferecidos para "Em Negociação"
  await Promise.all(itemsToUpdate);

  

  const dataForRepo = {
    message,
    proposerId,
    targetItemId,
    statusId: defaultStatusId.id, // Padrão "Pendente"
  };

  const proposal = await proposalRepository.create(dataForRepo, offeredItemIds);

  const targetItemOwner = await prisma.users.findUnique({
    where: { id: targetItem.userId },
    select: { email: true, name: true },
  });

  if (proposal) {
    await emailQueue.add("sendProposalReceived", {
      userEmail: targetItemOwner.email,
      proposalDetails: {
        itemOwnerName: targetItemOwner.name,
        itemName: targetItem.item_name,
      },
    });
  }


  return proposal;
}

//  Essa função retorna as propostas criadas(made) pelo current user
async function findUserProposals(userId, page = 1, limit = 10) {
  if (!userId) {
    throw new Error("ID do usuário não fornecido.");
  }
  const proposals = await proposalRepository.findUserProposals(
    userId,
    page,
    limit
  );
  return proposals;
}

// Essa função retorna as propostas recebidas(received) pelo current user
async function findProposalsReceived(userId, page = 1, limit = 10) {
  if (!userId) {
    throw new Error("ID do usuário não fornecido.");
  }

  return await proposalRepository.findUserReceivedProposals(
    userId,
    page,
    limit
  );
}

async function deleteProposal(id, proposerId) {
  // verifica se o id da proposta ou usuario existe no BD
  if (!id || !proposerId) {
    throw new Error("ID da proposta ou do usuário não fornecido.");
  }

  // Chama o repositorio que faz o delete dessa proposta por id e atribui essa remoção dessa proposta a variavel 'deleted'
  const deleted = await proposalRepository.deleteProposalById(id, proposerId);

  // Se 'deleted' estiver vazia então mostra o erro
  if (deleted.count === 0) {
    throw new Error("Proposta não encontrada ou não pertence ao usuário.");
  }

  // Quando é feito a remoção da proposta retorna essa mensagem
  return { message: "Proposta deletada com sucesso." };
}

async function updateProposal(id, proposerId, updateProposal) {
  if (!id || !proposerId) {
    throw new Error("ID da proposta ou do usuário não fornecido.");
  }

  const updated = await proposalRepository.updateProposalById(
    id,
    proposerId,
    updateProposal
  );

  if (updated.count === 0) {
    throw new Error("Proposta não encontrada ou não pertence ao usuário.");
  }

  return { message: "Proposta atualizada com sucesso." };
}

async function acceptProposal(proposalId, acceptingUserId) {
  const proposal = await proposalRepository.findByIdWithItems(proposalId);
  if (!proposal) {
    throw new Error("Proposta não encontrada.");
  }

  if (proposal.targetItem.userId !== acceptingUserId) {
    throw new Error("Ação não permitida: você não é o dono do item alvo.");
  }

  const tradedItemStatus = await itemStatusRepository.findByName("Trocado");
  const acceptedProposalStatus = await proposalStatusRepository.findByName(
    "Aceita"
  );

  if (!tradedItemStatus || !acceptedProposalStatus) {
    throw new Error("Status 'Trocado' ou 'Aceita' não encontrado.");
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    await proposalRepository.updateStatus(
      proposalId,
      acceptedProposalStatus.id,
      tx
    );

    const offeredItemIds = proposal.offeredItems.map(
      (offered) => offered.itemId
    );
    const allItemsIdsToUpdate = [proposal.targetItemId, ...offeredItemIds];

    await tx.items.updateMany({
      where: { id: { in: allItemsIdsToUpdate } },
      data: { statusId: tradedItemStatus.id },
    });

    const proposerData = await tx.users.findUnique({
      where: { id: proposal.proposerId },
      select: { email: true, name: true },
    });

    const targetItem = await tx.items.findUnique({
      where: { id: proposal.targetItemId },
      select: { item_name: true, user: { select: { name: true, email: true } } },
    });

    return { proposerData, targetItem, allItemsIdsToUpdate };
  });

  console.log('Transaction Result:', transactionResult); 

  if (transactionResult) {
    await emailQueue.add("sendProposalAcceptedEmail", {
      userEmail: transactionResult.proposerData.email,
      proposalDetails: {
        itemName: transactionResult.targetItem.item_name,
        itemOwnerName: transactionResult.targetItem.user.name,
        itemOwnerEmail: transactionResult.targetItem.user.email,
      },
    });
  }

  return {
    success: true,
    updatedItems: transactionResult.allItemsIdsToUpdate.length,
    proposalId,
  };
}

async function declineProposal(proposalId, decliningUserId) {
  const proposal = await proposalRepository.findByIdWithItems(proposalId);
  if (!proposal) {
    throw new Error("Proposta não encontrada.");
  }

  if (proposal.targetItem.userId !== decliningUserId) {
    throw new Error("Ação não permitida: você não é o dono do item alvo.");
  }

  const avaliableItemStatus = await itemStatusRepository.findByName(
    "Disponível"
  );
  const declinedProposalStatus = await proposalStatusRepository.findByName(
    "Recusada"
  );

  if (!avaliableItemStatus || !declinedProposalStatus) {
    throw new Error("Status 'Disponível' ou 'Recusada' não encontrado.");
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    await proposalRepository.updateStatus(
      proposalId,
      declinedProposalStatus.id,
      tx
    );

    const targetItemId = proposal.targetItemId;
    const offeredItemIds = proposal.offeredItems.map(
      (offered) => offered.itemId
    );
    const allItemsIdsToUpdate = [targetItemId, ...offeredItemIds];

    await tx.items.updateMany({
      where: { id: { in: allItemsIdsToUpdate } },
      data: { statusId: avaliableItemStatus.id },
    });

    const proposerData = await tx.users.findUnique({
      where: { id: proposal.proposerId },
      select: { email: true },
    });

    const targetItem = await tx.items.findUnique({
      where: { id: proposal.targetItemId },
      select: { item_name: true },
    });

    return { proposerData, targetItem, allItemsIdsToUpdate };
  });

  if (transactionResult) {
    await emailQueue.add("sendProposalDeclinedEmail", {
      userEmail: transactionResult.proposerData.email,
      proposalDetails: {
        itemName: transactionResult.targetItem.item_name,
      },
    });
  }

  return {
    success: true,
    updatedItems: transactionResult.allItemsIdsToUpdate.length,
    proposalId,
  };
}

module.exports = {
  acceptProposal,
  declineProposal,
  createProposal,
  findUserProposals,
  findProposalsReceived,
  deleteProposal,
  updateProposal,
};
