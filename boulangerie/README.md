# Boulangerie D.O — site web

Site vitrine de la Boulangerie D.O (rue Gambetta, 60100 Creil) : une vitrine 3D de photos, la carte, et pour chaque produit sa définition, son histoire et sa recette complète. En français par défaut, avec une version anglaise.

## Modifier les informations de la boutique

Tout est dans le bloc `CONFIG` en haut de `src/data.js` : numéro de rue, téléphone, horaires (un par jour, du lundi au dimanche), lien Instagram. Un champ laissé vide s’affiche « À compléter ».

## Photos

Par défaut, chaque produit affiche une vraie photo sous licence libre issue de **Wikimedia Commons**. Le navigateur du visiteur demande la photo à Commons avec son auteur et sa licence, qui sont crédités sous la photo et dans le pied de page (« Crédits photo »). La liste des fichiers est dans `PHOTOS` (`src/data.js`) ; pour chaque produit, plusieurs noms de fichiers sont indiqués et le premier qui existe est utilisé.

Les photos sont aussi copiées dans le site lui-même par le workflow GitHub `.github/workflows/bakery-photos.yml` : à chaque modification de `PHOTOS`, il télécharge les photos, les recadre au format 4:5 en WebP dans `images/`, enregistre les crédits dans `src/photos.generated.js` et reconstruit `index.html`. Le site utilise alors ses propres copies, plus rapides, et ne dépend plus de Wikimedia. On peut aussi le lancer à la main depuis l’onglet Actions (« Run workflow »).

Pour mettre **vos propres photos** (recommandé : ce sont vos produits) :

1. placez le fichier dans `images/`, par exemple `images/croissant.webp` (format portrait 4:5 idéal) ;
2. dans `PHOTOS`, remplacez la ligne du produit par `croissant: { local: 'images/croissant.webp' },`.

Vos propres photos n’ont pas besoin de crédit. Les identifiants sont ceux de `PRODUCTS` (`croissant`, `chausson-aux-pommes`, `eclair`…).

## Construire et publier

```sh
python3 build.py
```

regroupe `src/` dans un seul `index.html`. Publiez ensuite `index.html` (et le dossier `images/` si vous avez ajouté vos photos) sur n’importe quel hébergement statique (Netlify, GitHub Pages, OVH…). Three.js, les polices et les photos Commons sont chargés depuis jsDelivr, Google Fonts et Wikimedia.
