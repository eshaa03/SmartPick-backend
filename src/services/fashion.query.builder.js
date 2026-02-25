export const buildFashionSearchQuery = (fashion) => {

  const parts = [

    fashion.color,
    fashion.material,
    fashion.pattern,
    fashion.type,
    fashion.fit,
    fashion.gender

  ];

  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

};
