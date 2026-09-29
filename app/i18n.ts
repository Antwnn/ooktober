import { Language } from "../src/ooktober/schema";

export type { Language };

export const translations = {
  nl: {
    subtitle:
      'Verdubbel mee de aandacht voor borstkanker in ooktober. Typ je naam hier. Bevat hij een ‘o’? Dan verdubbelt hij automatisch. Vergeet ons niet te taggen zodra je de video deelt. ',
    subtitlePoster:
      "Verdubbel mee de aandacht voor borstkanker in ooktober. Typ je naam hier, bevat het een ‘o’? Dan verdubbelt hij automatisch. Print je persoonlijke poster en hang het op een zichtbare plaats.",
    viewVideo: "Video",
    viewPoster: "Poster",
    fieldLabelVideo: "Jouw naam",
    fieldLabelPoster: "Jouw merk",
    fieldPlaceholder: "Bijv. Antoine",
    sharePreparing: "Video wordt voorbereid…",
    shareReady: "Tik om te delen",
    shareIdle: "Deel op sociale media",
    downloadRendering: "Video wordt gerenderd…",
    posterDownloadRendering: "PDF wordt gegenereerd…",
    downloadIdle: "Download",
    warningBlocked:
      "Ongepaste tekst gedetecteerd — alle tekst is verborgen in de video zolang dit woord er staat.",
    unknownError: "Onbekende fout",
    shareFailed: "Delen is mislukt",
    successDone: "Klaar!",
    successRetryLink: "Download opnieuw",
    saveToPhotos: "Bewaar in Foto's",
    saveToPhotosHint: "Kies daarna ‘Video bewaren’.",
    donate: "Doneer",
    shareSheetTitle: "Ooktober",
    shareSheetText: "Ik doe mee aan Ooktober voor Think Pink!",
    fullscreenEnter: "Volledig scherm",
    fullscreenExit: "Volledig scherm sluiten",
  },
  fr: {
    subtitle:
      "En ooctobre, on redouble d'attention pour le cancer du sein. Écrivez votre nom ci-dessous. Il contient un « o » ? Il sera automatiquement doublé. N’oubliez pas de nous taguer lorsque vous partagez votre vidéo.",
    subtitlePoster:
      "En ooctobre, on redouble d'attention pour le cancer du sein. Écrivez votre nom ici. Il contient un « o » ? Il sera automatiquement doublé. Imprimez votre affiche personnalisée et placez-la à un endroit bien visible.",
    viewVideo: "Vidéo",
    viewPoster: "Affiche",
    fieldLabelVideo: "Votre nom",
    fieldLabelPoster: "Votre marque",
    fieldPlaceholder: "Ex. Antoine",
    sharePreparing: "Préparation de la vidéo…",
    shareReady: "Touche pour partager",
    shareIdle: "Partager",
    downloadRendering: "Vidéo en cours de rendu…",
    posterDownloadRendering: "Génération du PDF…",
    downloadIdle: "Télécharger",
    warningBlocked:
      "Texte inapproprié détecté — tout le texte est masqué dans la vidéo tant que ce mot y figure.",
    unknownError: "Erreur inconnue",
    shareFailed: "Le partage a échoué",
    successDone: "C'est prêt !",
    successRetryLink: "Télécharger à nouveau",
    saveToPhotos: "Enregistrer dans Photos",
    saveToPhotosHint: "Choisissez ensuite « Enregistrer la vidéo ».",
    donate: "faites un don",
    shareSheetTitle: "Ooktober",
    shareSheetText: "Je participe à Ooktober pour Think Pink !",
    fullscreenEnter: "Plein écran",
    fullscreenExit: "Quitter le plein écran",
  },
} as const satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof (typeof translations)["nl"];
