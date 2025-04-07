import { useState } from 'react';
import { PlusCircle, Calculator, UserPlus2 } from 'lucide-react';

function App() {
  const [persons, setPersons] = useState([{ id: 1, name: '' }]);
  const [foods, setFoods] = useState([]);
  const [personCosts, setPersonCosts] = useState({});

  const handlePersonChange = (index, value) => {
    const updated = [...persons];
    updated[index].name = value;
    setPersons(updated);
  };

  const addPerson = () => {
    setPersons([...persons, { id: Date.now(), name: '' }]);
  };

  const addFood = () => {
    setFoods([...foods, { id: Date.now(), name: '', cost: '', included: {} }]);
  };

  const handleFoodChange = (index, key, value) => {
    const updated = [...foods];
    updated[index][key] = value;
    setFoods(updated);
  };

  const handleInclusion = (foodIndex, personId, value) => {
    const updated = [...foods];
    updated[foodIndex].included[personId] = value === 'yes';
    setFoods(updated);
  };

  const calculateCosts = () => {
    const costs = {};
    persons.forEach(p => {
      costs[p.id] = 0;
    });
    foods.forEach(food => {
      const includedPersons = Object.entries(food.included)
        .filter(([_, v]) => v)
        .map(([id]) => id);
      const share = food.cost / includedPersons.length;
      includedPersons.forEach(id => {
        costs[id] += share;
      });
    });
    setPersonCosts(costs);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-center text-indigo-700">🍽️ Split the Bill</h1>

      {/* Persons */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus2 className="text-blue-600" />
          <h2 className="text-2xl font-semibold">Add Persons</h2>
        </div>
        {persons.map((p, i) => (
          <input
            key={p.id}
            type="text"
            placeholder={`Person ${i + 1}`}
            className="border p-3 w-full rounded-xl shadow-md focus:outline-blue-500 bg-gray-50"
            value={p.name}
            onChange={e => handlePersonChange(i, e.target.value)}
          />
        ))}
        <button
          onClick={addPerson}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600"
        >
          <PlusCircle size={18} /> Add Person
        </button>
      </section>

      {/* Foods */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle className="text-green-600" />
          <h2 className="text-2xl font-semibold">Add Food Items</h2>
        </div>
        {foods.map((food, i) => (
          <div key={food.id} className="border p-4 rounded-xl shadow bg-white space-y-3">
            <input
              type="text"
              placeholder="Food Name"
              className="border p-3 rounded-xl w-full focus:outline-green-500 bg-gray-50"
              value={food.name}
              onChange={e => handleFoodChange(i, 'name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Cost"
              className="border p-3 rounded-xl w-full focus:outline-green-500 bg-gray-50"
              value={food.cost}
              onChange={e => handleFoodChange(i, 'cost', e.target.value)}
            />
            <div className="space-y-2">
              <p className="font-medium">Who shared this?</p>
              {persons.map(p => (
                <div key={p.id} className="flex items-center gap-4">
                  <span className="w-32 text-gray-700 font-medium">{p.name || 'Unnamed'}</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`food-${food.id}-person-${p.id}`}
                      value="yes"
                      checked={food.included[p.id] === true}
                      onChange={e => handleInclusion(i, p.id, e.target.value)}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`food-${food.id}-person-${p.id}`}
                      value="no"
                      checked={food.included[p.id] === false}
                      onChange={e => handleInclusion(i, p.id, e.target.value)}
                    />
                    No
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={addFood}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl shadow hover:bg-green-600"
        >
          <PlusCircle size={18} /> Add Food
        </button>
      </section>

      {/* Calculate Button */}
      <div className="text-center">
        <button
          onClick={calculateCosts}
          className="flex items-center gap-2 mx-auto bg-purple-600 text-white px-6 py-3 rounded-xl shadow hover:bg-purple-700"
        >
          <Calculator size={20} /> Calculate Cost
        </button>
      </div>

      {/* Final Table */}
      {Object.keys(personCosts).length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-center text-indigo-600">Final Cost Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-collapse shadow-lg rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-100 text-indigo-800">
                  <th className="border p-3 text-left">Name</th>
                  <th className="border p-3 text-left">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {persons.map(p => (
                  <tr key={p.id} className="even:bg-gray-50 hover:bg-gray-100">
                    <td className="border p-3 font-medium text-gray-700">{p.name || 'Unnamed'}</td>
                    <td className="border p-3 text-green-700 font-semibold">₹{(personCosts[p.id] || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
