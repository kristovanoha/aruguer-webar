# Databáze a file storage

## Současný stav

Databáze, Supabase klient, API routes, autentizace ani upload workflow nejsou
v projektu implementované. Aktuální demo načítá model přímo z veřejného
statického souboru public/models/robot.glb.

Neexistují:

- SQL migrations.
- Tabulky nebo RLS policies.
- Supabase environment variables.
- Server actions nebo API endpointy pro data.
- Upload do Supabase Storage.

## Plánovaný směr

Po zavedení backendu má být Supabase odděleno do lib/supabase, storage do
lib/storage a doménové operace do services. Veřejné tabulky musí mít RLS a
veřejný klient nesmí mít service-role klíč.

Pravděpodobné doménové entity, které je nutné před implementací upřesnit:

- properties – metadata nemovitosti.
- property_assets – obrázky, videa, GLB/USDZ a tracking targety.
- ar_experiences – konfigurace konkrétního AR režimu.
- profiles nebo organizations – vlastnictví a oprávnění.

Tento seznam není schéma a nesmí být migrován bez návrhu přístupových práv,
vlastnictví dat, mazání, verzování assetů a limitů storage.

## Bezpečnostní pravidla

- Service-role credentials patří pouze na server.
- Klientské proměnné mohou být pouze explicitně veřejné.
- Uploady musí validovat MIME type, velikost, příponu a vlastnictví.
- Velké soubory nemají procházet přes Vercel Function, pokud tomu lze zabránit.
- Produkční databáze se nemění přímo při lokálním vývoji.
