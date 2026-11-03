import handler from "../../api/claude.js";
import { nodeHandler } from "../_lib/node-compat.js";
export const onRequest = nodeHandler(handler);
