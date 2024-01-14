import React, { useState } from "react";
import FiltersPanel from "./FiltersPanel";
import styles from "./RecipesSearch.module.css";
import classes from "./SearchPanel.module.css";
import Filters from "./AddFilters/Filters";
import { Link, useHistory } from "react-router-dom";

const initialFilters = {
  time: [],
  category: [],
  cuisine: [],
  difficulty: [],
  seasonality: [],
  specialDiet: [],
};

const RecipeSearch = () => {
  const history = useHistory();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [searchValue, setSearchValue] = useState("");
  const [recipes, setRecipes] = useState([]);

  const closeFiltersHandler = () => {
    setFiltersOpen(false);
  };

  const openFiltersHandler = () => {
    setFiltersOpen(true);
  };

  const sendFiltersToParent = (updatedFilters) => {
    setFilters(updatedFilters);
  };

  const handleSearchInputChange = (event) => {
    setSearchValue(event.target.value);
  };

  const handleSearchClick = async () => {
    const searchWords = searchValue.split(" ");
  
    const allFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      acc[key] = value.map((filter) => filter.value);
      return acc;
    }, {});
  
    const filteredFilters = Object.entries(allFilters)
      .filter(([key, value]) => value.length > 0)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  
    try {
      const response = await fetch("http://localhost:5000/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchWords: searchWords,
          allFilters: filteredFilters,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Request failed!");
      }
  
      const data = await response.json();
      console.log("Recipes:", data.recipes);
  
      history.push("/searched-recipes", { recipes: data.recipes });
    } catch (error) {
      console.error("There was an error!", error);
    }
  };

  const handleVoiceButtonClick = () => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const voiceText = event.results[0][0].transcript;
      setSearchValue(voiceText);
    };
    recognition.start();
  };

  return (
    <>
      <Filters
        filtersOpen={filtersOpen}
        closeFiltersHandler={closeFiltersHandler}
        sendFilters={sendFiltersToParent}
        filters={filters}
      />

      <section className={`${styles.container} section`}>
        <div className={`${classes.content} wrapper`}>
          <h1 className={classes.title}>Search for a recipe</h1>
          <input
            className={classes.input}
            placeholder="Search"
            value={searchValue}
            onChange={handleSearchInputChange}
          />

          <div className={classes.buttons}>
            <button className={classes.button} onClick={openFiltersHandler}>
              Add Filters
            </button>
            <button className={classes.button} onClick={handleVoiceButtonClick}>
              Voice
            </button>
            <Link
              className={`${classes.button} ${classes["search-btn"]}`}
              onClick={handleSearchClick}
              to="/searched-recipes"
            >
              Search
            </Link>
          </div>

          {Object.entries(filters).map(([categoryName, categoryFilters]) => (
            <FiltersPanel
              key={categoryName}
              categoryName={categoryName}
              filters={categoryFilters}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default RecipeSearch;
