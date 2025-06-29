const { Router } = require("express");
const { proposalController } = require("../controllers/proposalController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { validateProposalData } = require("../middlewares/validateProposal");

const proposalRouter = Router();

proposalRouter.post(
  "/create",
  authenticateToken,
  validateProposalData,
  proposalController.handleCreateProposal
);

// Criada para visualizar as propostas criadas(made) pelo current user
proposalRouter.get(
  "/made",
  authenticateToken,
  proposalController.handleFindUserProposals
);

// Criada para visualizar as propostas recebidas(receveid) pelo current user
proposalRouter.get(
  "/received",
  authenticateToken,
  proposalController.handleReceivedUserProposals
);

// proposalRouter.delete("/:id", authenticateToken, proposalController.handleDeleteProposal);

// proposalRouter.put(
//   "/:id",
//   authenticateToken,
//   upload.single("itemImage"),
//   logRequestState,
//   proposalController.handleUpdateItem
// );



module.exports = proposalRouter;
