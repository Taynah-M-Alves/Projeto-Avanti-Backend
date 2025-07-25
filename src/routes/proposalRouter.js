const { Router } = require("express");
const { proposalController } = require("../controllers/proposalController");
const { validateProposalData } = require("../middlewares/validateProposal");

const proposalRouter = Router();

proposalRouter.post(
  "/create",
  validateProposalData,
  proposalController.handleCreateProposal
);

// Criada para visualizar as propostas criadas(made) pelo current user
proposalRouter.get("/made", proposalController.handleFindUserProposals);

// Criada para visualizar as propostas recebidas(receveid) pelo current user
proposalRouter.get("/received", proposalController.handleReceivedUserProposals);

// Quando for dado o comando HTTP DELETE mais a rota '/id' é chamado o proposal controle de delete
proposalRouter.delete("/:id", proposalController.handleDeleteProposal);

proposalRouter.put(
  "/:id",
  validateProposalData,
  proposalController.handleUpdateProposal
);

proposalRouter.post("/accept/:id", proposalController.handleAcceptProposal);

proposalRouter.post("/decline/:id", proposalController.handleDeclineProposal);

module.exports = proposalRouter;
