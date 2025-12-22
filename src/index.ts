/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */

// Force bundle these dependencies that @e2b/code-interpreter requires at runtime
import 'glob'

import { run } from './main.js'

/* istanbul ignore next */
run()
