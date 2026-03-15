# STRATÉJUS Core Build

Socle V1 du Strategus Core recentré sur le vrai périmètre métier :
- foundation multi-boutiques / multi-marques
- store selector data model
- tranche 1 Idea Validator
- API locale simple pour itérer vite

## Ce qui est inclus maintenant
- Schéma Prisma Core V1 : `Brand`, `Store`, `Integration`, `ProductIdea`, `ProductSource`, `TrendSignal`, `SeoSignal`, `OpportunityScore`, `ProductDecision`, `ExternalMapping`
- Contrat structurel : **1 boutique = 1 marque** (`Store.brandId` unique)
- API HTTP locale minimale pour :
  - créer une marque
  - créer une boutique
  - lister les boutiques (base du store selector)
  - créer une idée produit
  - ajouter des sources / signaux tendance / signaux SEO
  - scorer une idée
  - prendre une décision
  - relire le snapshot complet d’une idée
- Mode de dev simple avec Prisma + Postgres local

## Ce qui n’est plus étendu
Les anciens objets Ops/commerce (`Customer`, `Order`, `Ticket`, etc.) ne sont plus la direction du Core. La V1 actuelle se concentre sur le pipeline produit rentable.

## Endpoints V1
- `GET /health`
- `GET /api/stores`
- `GET /api/product-ideas/:id`
- `POST /api/brands`
- `POST /api/stores`
- `POST /api/product-ideas`
- `POST /api/product-ideas/source`
- `POST /api/product-ideas/signals/trend`
- `POST /api/product-ideas/signals/seo`
- `POST /api/product-ideas/score`
- `POST /api/product-ideas/decision`

## Démarrage exact
```bash
cd /home/eriyomi/Documents/strategus-core
cp .env.example .env
npm run db:start
npm run db:push
npm run db:generate
npm run db:smoke
npm start
```

## Scénarios utiles
```bash
npm run scenario:core-handlers
npm run scenario:http-api
```

## Exemple rapide
```bash
curl -X POST http://127.0.0.1:3000/api/brands \
  -H 'content-type: application/json' \
  -d '{"slug":"brand-cosy","name":"Brand Cosy"}'

curl -X POST http://127.0.0.1:3000/api/stores \
  -H 'content-type: application/json' \
  -d '{"brandId":"<brandId>","slug":"cosy-store","name":"Cosy Store"}'

curl -X POST http://127.0.0.1:3000/api/product-ideas \
  -H 'content-type: application/json' \
  -d '{
    "brandId":"<brandId>",
    "storeId":"<storeId>",
    "title":"Oreiller ergonomique premium",
    "keyword":"oreiller ergonomique",
    "source": {
      "sourceType":"keyword",
      "label":"Seed keyword",
      "reference":"oreiller ergonomique"
    }
  }'
```

## Limites assumées pour demain matin
- pas encore de SEO Architecture / PIM / Shopify Publish
- scoring V1 volontairement simple et historisé
- pas encore d’auth HTTP
- `StoreSelectorState` non matérialisé côté UI, mais le modèle `Brand`/`Store` + `GET /api/stores` est prêt pour le brancher
- mode dégradé API externes surtout traité par design : on peut injecter des signaux manuels sans inventer de données
