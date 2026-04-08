import { db, collection, addDoc, serverTimestamp } from './firebase';

const XAVIELA_UID = 'xaviela_official';

const xavielaPosts = [
  {
    imageUrl: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    caption: '¡Bienvenidos a mi fiesta! ✨ Gracias por acompañarme en esta noche tan especial. #Mis15 #XavielaXV',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 15234,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/1.png',
    caption: 'Un momento mágico que siempre recordaré. ✨ #Quinceañera #Xaviela',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 8432,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/2.png',
    caption: 'Sonrisas que iluminan mi noche. 😊💖 #Mis15 #XavielaXV',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 5210,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/3.png',
    caption: 'Detalles que hacen la diferencia. 🌸✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 3902,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/4.png',
    caption: 'Celebrando la vida y la amistad. 💕👯‍♀️',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 6789,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/5.png',
    caption: 'Un brindis por los sueños cumplidos. 🥂✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 9120,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/6.png',
    caption: 'Bajo las luces de mi gran noche. 🌟✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 4567,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/7.png',
    caption: 'Cada paso es un nuevo comienzo. 👠✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 7890,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/8.png',
    caption: 'La felicidad se comparte. ❤️✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 3456,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/9.png',
    caption: 'Noche de gala, noche de sueños. 👗✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 5678,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/10.png',
    caption: 'Brillando con luz propia. ✨🌟',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 8901,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/11.png',
    caption: 'Un cuento de hadas hecho realidad. 🏰✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 2345,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/12.png',
    caption: 'Elegancia y alegría en cada rincón. 🌸💖',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 6789,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/13.png',
    caption: 'Inmortalizando momentos inolvidables. 📸✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 4321,
    likedBy: []
  },
  {
    imageUrl: 'https://webcincodev.com/xaviela/galeria/14.png',
    caption: '¡Gracias a todos por venir! Los quiero. ❤️✨',
    authorName: 'Xaviela',
    authorPhoto: 'https://www.webcincodev.com/blog/wp-content/uploads/2026/03/webbanner.png',
    uid: XAVIELA_UID,
    likesCount: 9876,
    likedBy: []
  }
];

export async function seedXavielaData() {
  const postsRef = collection(db, 'posts');
  
  for (const post of xavielaPosts) {
    await addDoc(postsRef, {
      ...post,
      createdAt: serverTimestamp()
    });
  }
  console.log('Xaviela data seeded successfully!');
}
