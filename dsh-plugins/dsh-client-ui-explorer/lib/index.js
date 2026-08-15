/**
 * dsh-client-ui-filetree — node half. Pure UI plugin: the no-op apply exists
 * so the package is a valid Cordis entry (name/inject/apply) that appears in
 * the host Loader; the browser half ships via exports["./client"], discovered
 * through the package.json dsh.client declaration.
 */
export const name = 'dsh-client-ui-explorer'

/** Host plugin body — no host-side behavior for the file-tree panel plugin. */
function apply() {}
export { apply }
