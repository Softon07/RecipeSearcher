const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  isAdmin: { type: Boolean, required: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  favorites: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
  image: { type: String, required: true }, 
});

module.exports = mongoose.model("User", userSchema);
