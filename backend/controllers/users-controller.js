const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const HttpError = require("../models/http-error");
const User = require("../models/user-model");
const Recipe = require("../models/recipe-model");
const fileUpload = require("../middleware/file-upload");

exports.createUser = async (req, res, next) => {
  const { name, surname, email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return next(new HttpError("Invalid inputs passed, please check your data", 422));
  }

  if (!req.file) {
    const error = new HttpError("Image file is missing.", 400);
    return next(error);
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    return next(new HttpError("User with this email already exists.", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create a user, please try again.",
      500
    );
    return next(error);
  }

  const createdUser = new User({
    isAdmin: false,
    name: name,
    surname: surname,
    email: email,
    password: hashedPassword,
    image: req.file.path,
  });

  try {
    console.log("Próba utworzenia użytkownika");
    await createdUser.save();
  } catch (err) {
    return next(
      new HttpError("Signing up failed, please try again later.", 500)
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      "token_secret",
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Signing up failed, please try again later.", 500)
    );
  }

  console.log("Pomyślnie utworzono użytkownika");
  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: token,
    isAdmin: createdUser.isAdmin,
    image: createdUser.image,
  });
};

exports.signIn = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid credentials, could not sign in.", 401);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not sign in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Invalid credentials, could not sign in.", 401);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      "token_secret",
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Signing in failed, please try again later.", 500)
    );
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    isAdmin: existingUser.isAdmin,
  });
};

exports.getUserById = async (req, res, next) => {
  const userId = req.params.userId;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      500
    );
    return next(error);
  }

  res.status(200).json({ user, user });
};

exports.updateUserById = async (req, res, next) => {
  const userId = req.params.userId;
  const { isAdmin, name, surname, email, password } = req.body;

  let userToUpdate;
  try {
    userToUpdate = await User.findById(userId);
  } catch (err) {
    return next(new HttpError("Could not update user.", 500));
  }

  if (!userToUpdate) {
    return next(new HttpError("Could not find user for provided Id.", 404));
  }

  if (userToUpdate.image && req.file) {
    const imagePath = userToUpdate.image;

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting previous image:", err);
      }
    });
  }

  userToUpdate.isAdmin = isAdmin || false;
  userToUpdate.name = name || userToUpdate.name;
  userToUpdate.surname = surname || userToUpdate.surname;
  userToUpdate.email = email || userToUpdate.email;
  userToUpdate.password = password || userToUpdate.password;

  if (req.file) {
    userToUpdate.image = req.file.path;
  }

  try {
    await userToUpdate.save();
  } catch (err) {
    return next(new HttpError("Could not update user.", 500));
  }

  res.status(200).json({ user: userToUpdate.toObject({ getters: true }) });
};

exports.deleteUser = async (req, res, next) => {
  const userId = req.params.userId;
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("User not found.", 404);
    return next(error);
  }

  if (user.image) {
    const imagePath = user.image;

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image:", err);
      }
    });
  }

  try {
    await User.findByIdAndDelete(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not delete a user.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "User deleted successfully" });
};

exports.addRecipeToFavorites = async (req, res, next) => {
  let userId = req.params.userId;
  if (!userId) {
    userId = req.body.userId;
  }
  const { recipeId } = req.params;

  let recipe;
  try {
    recipe = await Recipe.findById(recipeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find recipe.", 500)
    );
  }

  if (!recipe) {
    return next(new HttpError("Recipe not found.", 404));
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find user.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  if (user.favorites.includes(recipeId)) {
    return next(new HttpError("Recipe already in favorites.", 422));
  }

  user.favorites.push(recipeId);

  try {
    await user.save();
  } catch (err) {
    return next(new HttpError("Could not add recipe to favorites.", 500));
  }

  res.status(200).json({
    message: `Recipe ${recipeId} added to favorites for user ${userId}`,
  });
};

exports.getFavoritesRecipes = async (req, res, next) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId).populate("favorites");

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    res.json({ favorites: user.favorites });
  } catch (err) {
    return next(new HttpError("Error getting user's favorite recipes.", 500));
  }
};

exports.getFavoriteRecipe = async (req, res, next) => {
  const userId = req.params.userId;
  const recipeId = req.params.recipeId;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find user.", 500)
    );
  }

  if (!user) {
    return next(new HttpError("User not found.", 404));
  }

  const favRecipeId = user.favorites.find(
    (fav) => fav.toString() === recipeId.toString()
  );

  if (!favRecipeId) {
    return next(new HttpError("Favorite recipe not found for this user.", 404));
  }

  let favRecipe;
  try {
    favRecipe = await Recipe.findById(favRecipeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find recipe.", 500)
    );
  }

  if (!favRecipe) {
    return next(new HttpError("Favorite recipe not found for this user.", 404));
  }

  res.json({ favorite: favRecipe.toObject({ getters: true }) });
};

exports.removeRecipeFromFavorites = async (req, res, next) => {
  let userId = req.params.userId;
  if (!userId) {
    userId = req.body.userId;
  }
  const { recipeId } = req.params;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("User not found.", 404);
    return next(error);
  }

  user.favorites.pull(recipeId);

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError("Could not remove recipe from favorites.", 500);
    return next(error);
  }

  res.status(200).json({
    message: `Recipe ${recipeId} removed from favorites for user ${userId}`,
  });
};

exports.getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find any users.",
      500
    );
    return next(error);
  }

  res.json({ users });
};

exports.updateRecipeById = async (req, res, next) => {
  const recipeId = req.params.recipeId;
  const {
    name,
    ingredients,
    instructions,
    time,
    category,
    cuisine,
    difficulty,
    seasonality,
    specialDiet,
  } = req.body;

  let recipeToUpdate;
  try {
    recipeToUpdate = await Recipe.findById(recipeId);
  } catch (err) {
    return next(new HttpError("Could not update recipe.", 500));
  }

  if (!recipeToUpdate) {
    return next(new HttpError("Could not find recipe for provided Id.", 404));
  }

  if (recipeToUpdate.image) {
    const imagePath = recipeToUpdate.image;

    try {
      await fs.unlink(imagePath);
    } catch (err) {
      console.error("Error deleting previous image:", err);
    }
  }

  const parsedIngredients = Array.isArray(ingredients)
    ? ingredients
    : ingredients.split(',').map((item) => item.trim());

  recipeToUpdate.name = name || recipeToUpdate.name;
  recipeToUpdate.ingredients = parsedIngredients || recipeToUpdate.ingredients;
  recipeToUpdate.instructions = instructions || recipeToUpdate.instructions;
  recipeToUpdate.time = time || recipeToUpdate.time;
  recipeToUpdate.category = category || recipeToUpdate.category;
  recipeToUpdate.cuisine = cuisine || recipeToUpdate.cuisine;
  recipeToUpdate.difficulty = difficulty || recipeToUpdate.difficulty;
  recipeToUpdate.seasonality = seasonality || recipeToUpdate.seasonality;
  recipeToUpdate.specialDiet = specialDiet || recipeToUpdate.specialDiet;

  if (req.file) {
    recipeToUpdate.image = req.file.path;
  }

  try {
    await recipeToUpdate.save();
  } catch (err) {
    return next(new HttpError("Could not update recipe.", 500));
  }

  res.status(200).json({ recipe: recipeToUpdate.toObject({ getters: true }) });
};