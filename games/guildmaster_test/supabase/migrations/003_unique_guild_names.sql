-- Guild names are public player identities and compare case-insensitively.
create unique index if not exists profiles_guild_name_unique_ci
  on public.profiles (lower(guild_name));
