import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const typeColors = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

const getGenerationAndRegion = (id) => {
  if (id <= 151) return { gen: "Gen 1", region: "Kanto Region" };
  if (id <= 251) return { gen: "Gen 2", region: "Johto Region" };
  if (id <= 386) return { gen: "Gen 3", region: "Hoenn Region" };
  if (id <= 493) return { gen: "Gen 4", region: "Sinnoh Region" };
  if (id <= 649) return { gen: "Gen 5", region: "Unova Region" };
  if (id <= 721) return { gen: "Gen 6", region: "Kalos Region" };
  if (id <= 809) return { gen: "Gen 7", region: "Alola Region" };
  if (id <= 905) return { gen: "Gen 8", region: "Galar Region" };
  return { gen: "Gen 9", region: "Paldea Region" };
};

export default function App() {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGens, setSelectedGens] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pokemonDetails, setPokemonDetails] = useState(null);

  useEffect(() => {
    const fetchPokemons = async () => {
      try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const results = response.data.results;

        const detailedPokemons = await Promise.all(
          results.map(async (poke) => {
            const res = await axios.get(poke.url);
            const { gen, region } = getGenerationAndRegion(res.data.id);
            return {
              id: res.data.id,
              name: res.data.name,
              image: res.data.sprites.other['official-artwork'].front_default || res.data.sprites.front_default,
              types: res.data.types.map((t) => t.type.name),
              gen,
              region,
            };
          })
        );

        setPokemons(detailedPokemons);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pokemons:', error);
        setLoading(false);
      }
    };

    fetchPokemons();
  }, []);

  const handleSelectPokemonByIdOrObj = async (pokeIdentifier) => {
    setModalLoading(true);
    setPokemonDetails(null);

    try {
      let pokeId;

      if (typeof pokeIdentifier === 'object') {
        setSelectedPokemon(pokeIdentifier);
        pokeId = pokeIdentifier.id;
      } else {
        const pokeRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokeIdentifier}/`);
        pokeId = pokeRes.data.id;
        const pokeName = pokeRes.data.name;
        const pokeImage = pokeRes.data.sprites.other['official-artwork'].front_default || pokeRes.data.sprites.front_default;
        const pokeTypes = pokeRes.data.types.map((t) => t.type.name);
        const { gen, region } = getGenerationAndRegion(pokeId);

        const newSelected = {
          id: pokeId,
          name: pokeName,
          image: pokeImage,
          types: pokeTypes,
          gen,
          region
        };
        setSelectedPokemon(newSelected);
      }

      const speciesRes = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokeId}/`);
      
      let flavorText = "No description available.";
      const englishEntry = speciesRes.data.flavor_text_entries.find(entry => entry.language.name === 'en');
      if (englishEntry) {
        flavorText = englishEntry.flavor_text.replace(/[\n\f]/g, ' ');
      }

      const habitatName = speciesRes.data.habitat ? speciesRes.data.habitat.name : "unknown";

      const evoChainUrl = speciesRes.data.evolution_chain.url;
      const evoRes = await axios.get(evoChainUrl);
      
      const rawEvoList = [];
      let currentEvoNode = evoRes.data.chain;
      do {
        const speciesUrlParts = currentEvoNode.species.url.split('/');
        const evoId = speciesUrlParts[speciesUrlParts.length - 2];
        rawEvoList.push({
          name: currentEvoNode.species.name,
          id: evoId
        });
        currentEvoNode = currentEvoNode.evolves_to[0];
      } while (currentEvoNode);

      const evoChainWithImages = await Promise.all(
        rawEvoList.map(async (evo) => {
          try {
            const evoPokeRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${evo.id}/`);
            return {
              name: evo.name,
              id: evo.id,
              image: evoPokeRes.data.sprites.front_default || evoPokeRes.data.sprites.other['official-artwork'].front_default
            };
          } catch {
            return {
              name: evo.name,
              id: evo.id,
              image: null
            };
          }
        })
      );

      const pokeResFull = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokeId}/`);

      setPokemonDetails({
        height: pokeResFull.data.height / 10,
        weight: pokeResFull.data.weight / 10,
        baseExp: pokeResFull.data.base_experience ?? "N/A",
        habitat: habitatName.charAt(0).toUpperCase() + habitatName.slice(1),
        stats: pokeResFull.data.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
        lore: flavorText,
        evolutionChain: evoChainWithImages
      });
      setModalLoading(false);
    } catch (error) {
      console.error("Error fetching detailed pokemon info:", error);
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPokemon(null);
    setPokemonDetails(null);
  };

  const handleGenToggle = (gen) => {
    if (selectedGens.includes(gen)) {
      setSelectedGens(selectedGens.filter((g) => g !== gen));
    } else {
      setSelectedGens([...selectedGens, gen]);
    }
  };

  const handleTypeToggle = (type) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const filteredPokemons = pokemons.filter((p) => {
    const searchTerm = search.toLowerCase().trim();
    const stringId = String(p.id);
    const paddedId = String(p.id).padStart(3, '0');

    const matchesSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm) ||
      stringId === searchTerm ||
      paddedId.includes(searchTerm);

    const matchesGen = selectedGens.length === 0 || selectedGens.includes(p.gen);
    const matchesType = selectedTypes.length === 0 || p.types.some((t) => selectedTypes.includes(t));

    return matchesSearch && matchesGen && matchesType;
  });

  const gensList = ["Gen 1", "Gen 2", "Gen 3", "Gen 4", "Gen 5", "Gen 6", "Gen 7", "Gen 8", "Gen 9"];

  return (
    <div className="pokedex-app">
      <header className="pokedex-header">
            
      <h1>Pokédex</h1>

        <div className="filter-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by Name or ID ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="multi-select-section">
            <div className="filter-group">
              <span className="filter-label">Generations:</span>
              <div className="badge-options">
                {gensList.map((gen) => (
                  <button
                    key={gen}
                    type="button"
                    className={`filter-option-badge ${selectedGens.includes(gen) ? 'active' : ''}`}
                    onClick={() => handleGenToggle(gen)}
                  >
                    {gen}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Types (Multi-select):</span>
              <div className="badge-options">
                {Object.keys(typeColors).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`filter-option-badge ${selectedTypes.includes(type) ? 'active' : ''}`}
                    onClick={() => handleTypeToggle(type)}
                    style={{
                      borderColor: selectedTypes.includes(type) ? '#fff' : typeColors[type],
                      backgroundColor: selectedTypes.includes(type) ? typeColors[type] : 'transparent'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pokedex-body">
        {loading ? (
          <div className="loading">Loading all Pokémon data... (Please wait)</div>
        ) : (
          <div className="pokemon-grid">
            {filteredPokemons.map((pokemon) => {
              const formattedId = `#${String(pokemon.id).padStart(3, '0')}`;

              return (
                <div
                  key={pokemon.id}
                  className="pokemon-card-new"
                  onClick={() => handleSelectPokemonByIdOrObj(pokemon)}
                >
                  <div className="card-top-row">
                    <span className="card-gen-badge">{pokemon.gen}</span>
                    <span className="card-id-badge">{formattedId}</span>
                  </div>

                  <div className="card-image-container">
                    <img src={pokemon.image} alt={pokemon.name} />
                  </div>

                  <div className="card-info-section">
                    <h3 className="card-pokemon-name">
                      {pokemon.name.toUpperCase()}
                    </h3>
                    <span className="card-region-text">{pokemon.region}</span>
                  </div>

                  <div className="card-footer-badge">
                    {pokemon.types.map((type) => (
                      <span
                        key={type}
                        className="type-badge-new"
                        style={{ backgroundColor: typeColors[type] || '#555' }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

     {selectedPokemon && (
        <div className="modal-overlay" onClick={closeModal}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>&times;</button>

            <div className="modal-header">
              <span className="modal-id">#{String(selectedPokemon.id).padStart(3, '0')}</span>
              <h2>{selectedPokemon.name.charAt(0).toUpperCase() + selectedPokemon.name.slice(1)}</h2>
              <span className="modal-gen">{selectedPokemon.gen}</span>
            </div>

            <div className="modal-image-container">
              <img src={selectedPokemon.image} alt={selectedPokemon.name} />
            </div>

            <div className="modal-types">
              {selectedPokemon.types.map((type) => (
                <span key={type} className="type-badge" style={{ backgroundColor: typeColors[type] || '#555' }}>
                  {type}
                </span>
              ))}
            </div>

            {modalLoading ? (
              <div className="modal-loading">Loading Pokémon profile details...</div>
            ) : pokemonDetails ? (
              <div className="modal-details-body">
                <div className="detail-section">
                  <h4>Pokédex Lore</h4>
                  <p className="lore-text">"{pokemonDetails.lore}"</p>
                </div>

                <div className="detail-section traits-section">
                  <div className="trait-box">
                    <span className="trait-label">Height</span>
                    <span className="trait-value">{pokemonDetails.height} m</span>
                  </div>
                  <div className="trait-box">
                    <span className="trait-label">Weight</span>
                    <span className="trait-value">{pokemonDetails.weight} kg</span>
                  </div>
                </div>

                <div className="detail-section traits-section">
                  <div className="trait-box">
                    <span className="trait-label">Habitat</span>
                    <span className="trait-value">{pokemonDetails.habitat}</span>
                  </div>
                  <div className="trait-box">
                    <span className="trait-label">Base Exp</span>
                    <span className="trait-value">{pokemonDetails.baseExp}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Base Stats</h4>
                  <div className="stats-container">
                    {pokemonDetails.stats.map((stat) => (
                      <div key={stat.name} className="stat-row">
                        <span className="stat-name">{stat.name.toUpperCase()}</span>
                        <span className="stat-num">{stat.value}</span>
                        <div className="stat-bar-bg">
                          <div 
                            className="stat-bar-fill" 
                            style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Evolution Family</h4>
                  <div className="evolution-chain">
                    {pokemonDetails.evolutionChain.map((evo, index) => (
                      <React.Fragment key={evo.name}>
                        {index > 0 && <span className="evo-arrow">➔</span>}
                        <div 
                          className={`evo-node ${evo.name === selectedPokemon.name ? 'current-evo' : ''}`}
                          onClick={() => handleSelectPokemonByIdOrObj(evo.id)}
                          title={`Click to view ${evo.name}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {evo.image && <img src={evo.image} alt={evo.name} className="evo-sprite" />}
                          <span>{evo.name.charAt(0).toUpperCase() + evo.name.slice(1)}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}