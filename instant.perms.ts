// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  $users: {
    allow: {
      view: "true",
    },
  },
  $default: {
    allow: {
      $default: "true",
    },
  },
} satisfies InstantRules;

export default rules;
