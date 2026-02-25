import api from "./axios";

export const getRecommendations = async (query) => {
  const res = await api.get(`/recommendations?query=${encodeURIComponent(query)}`);
  return res.data;
};
