# Boulangerie D.O — site web

Site vitrine de la Boulangerie D.O (rue Gambetta, 60100 Creil) : une vitrine 3D de photos, la carte, et pour chaque produit sa définition, son histoire et sa recette complète. En français par défaut, avec une version anglaise.

## Modifier les informations de la boutique

Tout est dans le bloc `CONFIG` en haut de `src/data.js` : numéro de rue, téléphone, horaires (un par jour, du lundi au dimanche), lien Instagram. Un champ laissé vide s’affiche « À compléter ».

## Ajouter les photos

Pour chaque produit, placez deux fichiers dans `images/` :

- `<id>-800.webp` (cartes et vitrine 3D)
- `<id>-1400.webp` (page produit)

au format portrait 4:5, puis ajoutez une entrée dans `PHOTOS` (`src/data.js`) :

```js
croissant: { focus: [0.5, 0.5], alt: { fr: 'Croissants dorés', en: 'Golden croissants' }, credit: null },
```

Les identifiants sont ceux de `PRODUCTS` (`croissant`, `chausson-aux-pommes`, `eclair`…). `credit` est à remplir pour une photo sous licence (auteur, source, licence, lien) ; laissez `null` pour vos propres photos.

## Construire et publier

```sh
python3 build.py
```

regroupe `src/` dans un seul `index.html`. Publiez ensuite `index.html` et le dossier `images/` sur n’importe quel hébergement statique (Netlify, GitHub Pages, OVH…). Three.js et les polices sont chargés depuis jsDelivr et Google Fonts.
