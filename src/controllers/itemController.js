const itemService = require("../services/itemService");
const z = require("zod");

async function handleCreateItem(req, res) {
  try {
    const {
      item_name,
      description,
      conditionId,
      categoryIds,
      imageUrl,
      publicId,
    } = req.body;

        console.log("Dados da req:", req.body);


    const userId = req.user.id;

    const itemData = {
      name: item_name,
      description: description,
      conditionId: conditionId,
      imageUrl: imageUrl,
      publicId: publicId,
    };

    console.log("Dados do item:", itemData);

    const newItem = await itemService.createItem(itemData, categoryIds, userId);
    res.status(201).json(newItem);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao criar o item." });
  }
}

async function handleGetAllItems(req, res) {
  try {
    const querySchema = z.object({
      page: z.string().transform(Number).optional().default(1),
      limit: z.string().transform(Number).optional().default(10),
      search: z.string().optional(),
      conditionSlug: z.string().optional(),
      categorySlug: z.string().optional(),
      state: z.string().optional(), // ✅ Campo de estado
      city: z.string().optional(),  // ✅ Campo de cidade
      orderBy: z.string().optional().default("created_at"),
      orderDirection: z.enum(["asc", "desc"]).optional().default("desc"),
      //itemStatus: z.string().optional(),
    });

    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        issues: parsed.error.issues,
      });
    }

    const { page, limit, conditionSlug, categorySlug, search, state, city, orderBy, orderDirection } = parsed.data;

    const orderByClause = {
      [orderBy]: orderDirection,
    };

    const where = { AND: [] };
    if (conditionSlug) {
      where.AND.push({ condition: { slug: conditionSlug } });
    }

    //if (itemStatus.slug) {
     // where.AND.push({ status: { slug: itemStatus.slug } });
    //}

    if (categorySlug) {
      where.AND.push({ categories: { some: { category: { slug: categorySlug } } } });
    }
    if (search) {
      /*where.AND.push({
        item_name: {
          contains: search,
          mode: "insensitive",
        },
        description: {
          contains: search,
          mode: "insensitive",
        },
      });*/
      where.AND.push({
        OR: [
          { item_name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (state) {
      where.AND.push({
        user: {
          state: {
            contains: state,
            mode: "insensitive",
          },
        },
      });
    }

    if (city) {
      where.AND.push({
        user: {
          city: {
            contains: city,
            mode: "insensitive",
          },
        },
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }
  

    const result = await itemService.findAllItems(where,  page, limit, orderByClause);

    const formattedItems = result.items.map((item) => ({
      id: item.id,
      itemName: item.item_name,
      description: item.description,
      condition: {
        id: item.condition.id,
        name: item.condition.name,
        slug: item.condition.slug,
      },
      status: {
        id: item.status.id,
        name: item.status.name,
        slug: item.status.slug,
      },
      imageUrl: item.image_url,
      imageId: item.image_public_id,
      categories: item.categories.map((cat) => ({
        id: cat.category.id,
        name: cat.category.name,
        slug: cat.category.slug,
      })),
      user: {
        id: item.user.id,
        name: item.user.name,
        city: item.user.city,
        state: item.user.state,
      },
    }));

    res.status(200).json({
      page,
      limit,
      totalItems: result.total,
      totalPages: result.totalPages,
      items: formattedItems,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao buscar os itens." });
  }
}

async function handleDeleteItem(req, res) {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;

    await itemService.deleteItem(itemId, userId);

    res.status(200).json({ message: "Item deletado com sucesso." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao deletar o item." });
  }
}

async function handleUpdateItem(req, res) {
  try {
    const itemId = req.params.id;
    const { item_name, description, conditionId, statusId, categoryIds } =
      req.body;
    const userId = req.user.id;
    const imageFile = req.file; // Arquivo de imagem enviado

    const itemData = {
      name: item_name,
      description: description,
      conditionId: conditionId,
      statusId: statusId,
    };

    const updatedItem = await itemService.updateItem(
      itemId,
      itemData,
      categoryIds,
      userId,
      imageFile
    );

    res.status(200).json(updatedItem);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao atualizar o item." });
  }
}

async function handleGetItemById(req, res) {
  try {
    const itemId = req.params.id;
    const item = await itemService.findItemById(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    console.log("Item encontrado:", item);

    const formattedItem = {
      id: item.id,
      itemName: item.item_name,
      description: item.description,
      condition: item.condition.name,
      status: item.status.name,
      imageUrl: item.image_url,
      imageId: item.imageId,
      categories: item.categories.map((cat) => ({
        id: cat.category.id,
        name: cat.category.name,
      })),
      user: {
        id: item.user.id,
        name: item.user.name,
        city: item.user.city,
        state: item.user.state,
      },
      createdAt: item.created_at.toLocaleDateString(),
    };

    res.status(200).json(formattedItem);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao buscar o item." });
  }
}

async function handleGetUserItems(req, res) {
  try {
    const userId = req.user.id;
    const items = await itemService.findItemsByUserId(userId);

    if (!items || items.length === 0) {
      return res.status(404).json({ message: "Nenhum item encontrado." });
    }

    const formattedItems = items.map((item) => ({
      id: item.id,
      itemName: item.item_name,
      description: item.description,
      condition: item.condition.name,
      status: item.status.name,
      imageUrl: item.image_url,
      imageId: item.image_public_id,
      categories: item.categories.map((cat) => ({
        id: cat.category.id,
        name: cat.category.name,
        slug: cat.category.slug,
      })),
    }));

    res.status(200).json(formattedItems);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Erro ao buscar os itens do usuário." });
  }
}

module.exports = {
  itemController: {
    handleCreateItem,
    handleGetUserItems,
    handleGetAllItems,
    handleDeleteItem,
    handleUpdateItem,
    handleGetItemById,
  },
};
