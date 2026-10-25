// Single source of truth for the release number: package.json. Bump it there
// and the login screen and Adventurer's Log follow on the next build.
import { version } from "../package.json";

export const VERSION = version;
