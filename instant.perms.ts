{
  "$users": {
    "allow": {
      "view": "auth.id == data.id",
      "create": "false",
      "update": "false",
      "delete": "false",
      "unlink": {
        "recipes": "auth.id == data.id",
        "menus":   "auth.id == data.id"
      }
    }
  },

  "recipes": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('owner.id')",
      "delete": "auth.id in data.ref('owner.id')",
      "unlink": {
        "owner": "linkedData.id == auth.id"
      }
    }
  },

  "ingredients": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('recipe.owner.id')",
      "delete": "auth.id in data.ref('recipe.owner.id')",
      "unlink": {
        "recipe": "linkedData.owner.id == auth.id"
      }
    }
  },

  "menus": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('owner.id')",
      "delete": "auth.id in data.ref('owner.id')",
      "unlink": {
        "owner": "linkedData.id == auth.id"
      }
    }
  },

  "menuItems": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id in data.ref('menu.owner.id')",
      "delete": "auth.id in data.ref('menu.owner.id')",
      "unlink": {
        "menu":   "linkedData.owner.id == auth.id",
        "recipe": "linkedData.owner.id == auth.id"
      }
    }
  },

  "$files": {
    "allow": {
      "view": "true",
      "create": "auth.id != null",
      "update": "auth.id != null",
      "delete": "auth.id != null"
    }
  }
}
