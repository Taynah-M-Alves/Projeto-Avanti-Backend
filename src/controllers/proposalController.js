const proposalService = require("../services/proposalService");

// Requisita as propostas feita pelo current user
async function handleCreateProposal(req, res) {
  try {
    const { message, itemId: targetItemId, offeredItemsIds } = req.body;
   
    const proposerId = req.user.id;
    console.log("Proposer ID:", proposerId);

    // Validar se o usuário está autenticado
    if (!proposerId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const proposalData = {
      message,
      targetItemId,
    };
    
    console.log("Proposal Data:", proposalData);

    // Chamar o serviço para criar a proposta
    const newProposal = await proposalService.createProposal(
      proposalData,
      offeredItemsIds,
      proposerId
    );

    res.status(201).json(newProposal);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Erro ao criar o item.",
    });
  }
}

async function handleFindUserProposals(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Padrão de página 1
    const limit = parseInt(req.query.limit) || 10; // Padrão de 10 itens por página

    // Validar se o usuário está autenticado
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    //console.log("User ID:", userId);

    // Chamar o serviço para buscar as propostas do usuário
    const { proposals, total, totalPages } =
      await proposalService.findUserProposals(userId, page, limit);

    //console.log("Proposals:", proposals);
    const formattedProposals = proposals.map((proposal) => ({
      id: proposal.id,
      message: proposal.message,
      proposer: proposal.proposer,
      targetItem: {
        id: proposal.targetItemId,
        itemName: proposal.targetItem.item_name,
        imageUrl: proposal.targetItem.image_url,
        condition: proposal.targetItem.condition.name,
        user: {
          name: proposal.targetItem.user.name,
          city: proposal.targetItem.user.city,
          state: proposal.targetItem.user.state,
        },
      },
      offeredItems: (proposal.offeredItems || []).map((item) => ({
        id: item.item.id,
        itemName: item.item.item_name,
        imageUrl: item.item.image_url,
        description: item.item.description,
        condition: {
          name: item.item.condition.name,
        }
      })),
      status: proposal.status.status_name,
      createdAt: proposal.created_at,
    }));

    res.status(200).json({
      page,
      limit,
      totalItems: total,
      totalPages,
      proposals: formattedProposals,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Erro ao buscar propostas do usuário.",
    });
  }
}

async function handleReceivedUserProposals(req, res) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Padrão de página 1
    const limit = parseInt(req.query.limit) || 10; // Padrão de 10 itens por página

    // Validar se o usuário está autenticado
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    //console.log("User ID:", userId);

    // Chamar o serviço para buscar as propostas do usuário
    const { proposals, total, totalPages } =
      await proposalService.findProposalsReceived(userId, page, limit);

    //console.log("Proposals:", proposals);

    const formattedProposals = proposals.map((proposal) => ({
      id: proposal.id,
      message: proposal.message,
      proposer: proposal.proposer,
      targetItem: {
        id: proposal.targetItemId,
        itemName: proposal.targetItem.item_name,
        imageUrl: proposal.targetItem.image_url,
        condition: proposal.targetItem.condition.name,
        user: {
          name: proposal.targetItem.user.name,
          city: proposal.targetItem.user.city,
          state: proposal.targetItem.user.state,
        },
      },
      offeredItems: (proposal.offeredItems || []).map((item) => ({
        id: item.item.id,
        itemName: item.item.item_name,
        imageUrl: item.item.image_url,
        description: item.item.description,
        condition: {
          name: item.item.condition.name,
        }
      })),
      status: proposal.status.status_name,
      createdAt: proposal.created_at,
    }));

    res.status(200).json({
      page,
      limit,
      totalItems: total,
      totalPages,
      proposals: formattedProposals,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Erro ao buscar propostas do usuário.",
    });
  }
}

async function handleDeleteProposal(req, res) {
  try {
    // Define que a Id da proposta vira no params
    const id = req.params.id;

    // Define que o Id do usuario que atualizou a proposta será o usuario atual.
    const proposerId = req.user.id;

    // Chama o repositorio de remoção de proposta e atribui a remoção a variavel 'result'
    const result = await proposalService.deleteProposal(id, proposerId);

    // Mensagem exibida quando a remoção é realizada
    res.status(200).json({ message: "Proposta deletado com sucesso." });

    // Se der erro vai retornar essa mensagem
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Erro ao deletar o proposta.",
    });
  }
}

async function handleUpdateProposal(req, res) {
  try {
    const id = req.params.id;
    const proposerId = req.user.id;
    const { message } = req.body;

    // Para que toda proposta editada tenha status "Pendente" como default.
    const statusId = "6b09c9cf-e12b-439b-886e-73c7d71ac29b";

    // Validar se o usuário está autenticado
    if (!proposerId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const ProposalData = {};
    if (message) ProposalData.message = message;
    if (statusId) ProposalData.statusId = statusId;

    const result = await proposalService.updateProposal(
      id,
      proposerId,
      ProposalData
    );

    res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Erro ao atualizar o item.",
    });
  }
}

async function handleAcceptProposal(req, res, next) {
  try {
    const { id: proposalId } = req.params;
    const { id: acceptingUserId } = req.user;

    console.log(
      `Usuário ${acceptingUserId} está aceitando a proposta ${proposalId}`
    );

    if (!proposalId || !acceptingUserId) {
      return res.status(400).json({
        message: "ID da proposta ou do usuário não fornecido.",
      });
    }

    const result = await proposalService.acceptProposal(
      proposalId,
      acceptingUserId
    );

    res
      .status(200)
      .json({ message: "Proposta aceita com sucesso.", data: result });
  } catch (error) {
    next(error);
  }
}

async function handleDeclineProposal(req, res, next) {
  try {
    const { id: proposalId } = req.params;
    const { id: decliningUserId } = req.user;

    console.log(
      `Usuário ${decliningUserId} está rejeitando a proposta ${proposalId}`
    );

    if (!proposalId || !decliningUserId) {
      return res.status(400).json({
        message: "ID da proposta ou do usuário não fornecido.",
      });
    }

    const result = await proposalService.declineProposal(
      proposalId,
      decliningUserId
    );

    res.status(200).json({ message: "Proposta rejeitada.", data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  proposalController: {
    handleCreateProposal,
    handleFindUserProposals,
    handleReceivedUserProposals,
    handleDeleteProposal,
    handleUpdateProposal,
    handleAcceptProposal,
    handleDeclineProposal,
  },
};
