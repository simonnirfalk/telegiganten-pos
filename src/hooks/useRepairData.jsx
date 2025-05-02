// hooks/useRepairData.js
import { useState, useEffect } from "react";

export default function useRepairData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [brandsRes, modelsRes, repairsRes] = await Promise.all([
          fetch("https://telegiganten.dk/wp-json/telegiganten/v1/brands"),
          fetch("https://telegiganten.dk/wp-json/telegiganten/v1/models"),
          fetch("https://telegiganten.dk/wp-json/telegiganten/v1/repairs")
        ]);

        const [brands, models, repairs] = await Promise.all([
          brandsRes.json(),
          modelsRes.json(),
          repairsRes.json()
        ]);

        // Saml data
        const structure = brands.map((brand) => {
          const brandModels = models
            .filter((m) => m.brand_id === brand.id)
            .map((model) => {
              const modelRepairs = repairs.filter((r) => r.model_id === model.id);
              return {
                ...model,
                repairs: modelRepairs
              };
            });

          return {
            ...brand,
            models: brandModels
          };
        });

        setData(structure);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
