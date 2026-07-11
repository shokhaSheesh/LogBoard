// Central map of which permission key gates *reading* each admin screen.
// Write actions are gated inline on each page via useAuth().can('<module>.<action>').
//
// Note: Admin Users is listed/read with board_users.read (per the API spec);
// creating/updating an admin-kind user additionally needs admin_users.<action>,
// and only Super Admin (who holds admin_users.delete) can delete one.
export const SCREEN_READ: Record<string, string> = {
  '/admin/dashboard':          'dashboard.read',
  '/admin/companies':          'companies.read',
  '/admin/subscriptions':      'subscriptions.read',
  '/admin/notifications':      'notifications.read',
  '/admin/board-users':        'board_users.read',
  '/admin/admin-users':        'board_users.read',
  '/admin/roles-permissions':  'roles.read',
  '/admin/permission-modules': 'modules.read',
};
