const itemRepository = require("../repository/itemRepository");
const statusRepository = require("../repository/statusRepository");

async function createItem(itemData, categoryIds, userId) {
  if (!itemData.imageUrl || !itemData.publicId) {
    throw new Error("Imagem e Imagem ID do item são obrigatórios.");
  }

  const availableStatus =
    await statusRepository.itemStatusRepository.findByName("Disponível");

  const dataForRepo = {
    name: itemData.name,
    description: itemData.description,
    conditionId: itemData.conditionId,
    statusId: availableStatus.id,
    userId: userId,
    image_url: itemData.imageUrl,
    image_public_id: itemData.publicId,
  };

  // console.log("Data for repository:", dataForRepo);

  const item = await itemRepository.create(dataForRepo, categoryIds);
  return item;
}

async function updateItem(itemId, itemData, categoryIds, userId, imageFile) {
  const item = await itemRepository.findById(itemId);

  if (!item) {
    throw new Error("Item não encontrado.");
  }

  const itemStatus = await statusRepository.itemStatusRepository.findByName(
    "Disponível"
  );

  if (itemStatus.id != item.statusId) {
    const err = new Error(
      "Você só pode atualizar itens que estão com o status 'Disponível'."
    );
    err.name = "InvalidActionError";
    throw err;
  }

  if (item.userId !== userId) {
    const err = new Error("Você não tem permissão para atualizar este item.");
    err.name = "UnauthorizedError";
    throw err;
  }

  const dataForRepo = {
    ...itemData,
    userId: userId,
    image_url: imageFile ? imageFile.path : null,
    imageId: imageFile ? imageFile.filename : null,
  };

  return await itemRepository.updateItem(itemId, dataForRepo, categoryIds);
}

async function updateStatus(itemId, statusId, tx) {
  return await itemRepository.updateStatus(itemId, statusId, tx);
}

async function findAllItems(where,  page = 1, limit = 10, orderBy) {

  

  return await itemRepository.findAllItems(where, page, limit, orderBy);
}

async function deleteItem(itemId, userId) {
  const item = await itemRepository.findUnique(
    { id: itemId },
    {
      status: {
        select: {
          status_name: true,
        },
      },
    }
  );

  if (!item) {
    throw new Error("Item não encontrado.");
  }

  if (item.userId !== userId) {
    const err = new Error("Você não tem permissão para deletar este item.");
    err.name = "UnauthorizedError";
    throw err;
  }

  if (item.status.status_name !== "Disponível") {
    const err = new Error(
      "Você só pode deletar itens que estão com o status 'Disponível'."
    );
    err.name = "InvalidActionError";
    throw err;
  }

  return await itemRepository.deleteItem(itemId);
}

async function findItemById(itemId) {
  return await itemRepository.findById(itemId);
}

async function findItemsByUserId(userId, page = 1, limit = 10) {
  if (!userId) {
    throw new Error("ID do usuário não fornecido.");
  }
  return await itemRepository.findItemsByUserId(userId, page, limit);
}

module.exports = {
  createItem,
  findAllItems,
  deleteItem,
  findItemsByUserId,
  findItemById,
  updateItem,
  updateStatus,
};
