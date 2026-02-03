
export const WEB_GENERAL_MOCK_DATA = {
  missions_data: [
    { mission_name_english: 'qa', mission_name_hebrew: 'תחקור' },
    { mission_name_english: 'new_missions', mission_name_hebrew: 'משימות חדשות' },
  ],
  users: [
    {
      display_name: 'Yossi Cohen',
      full_display_name: 'Yossi Cohen',
      origin_name: 'Internal',
      email: 'yossi.c@mission-control.com',
      hierarchy: 'root/commander',
    },
    {
      display_name: 'Noa Levi',
      full_display_name: 'Noa Levi',
      origin_name: 'External',
      email: 'noa.l@field.com',
      hierarchy: 'root/field_op',
    },
  ],
  teams: [
    {
      team_name: 'Alpha Squad',
      team: 'ALPHA',
      parent_uuid: '00000000-0000-0000-0000-000000000000',
    },
    {
      team_name: 'Bravo Team',
      team: 'BRAVO',
      parent_uuid: '00000000-0000-0000-0000-000000000000',
    },
  ],
  geometries: [
    {
      geometry_name: 'Sector A-1',
      geometry: 'POLYGON((34.8 32.1, 34.9 32.1, 34.9 32.2, 34.8 32.2, 34.8 32.1))',
    },
    {
      geometry_name: 'Point of Interest 1',
      geometry: 'POINT(34.85 32.15)',
    },
  ],
  geometry_to_team: [],
  user_to_team: [],
};
