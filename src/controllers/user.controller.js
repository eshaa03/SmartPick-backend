import Preference from "../models/Preference.js";

export const getPreferences = async (req, res) => {
  try {
    const prefs = await Preference.findOne({ userId: req.user.id });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch preferences" });
  }
};

export const savePreferences = async (req, res) => {
  try {
    const prefs = await Preference.create({
      userId: req.user.id,
      ...req.body,
    });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: "Failed to save preferences" });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const updated = await Preference.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update preferences" });
  }
};
