import { useState } from 'react';
import { PlusCircle, Calculator, UserPlus2, Receipt, DollarSign, Utensils, ArrowRight,StickyNote } from 'lucide-react';

function App() {
  const [persons, setPersons] = useState([{ id: 1, name: '' }]);
  const [foods, setFoods] = useState([]);
  const [personCosts, setPersonCosts] = useState({});
  const [finalAmounts, setFinalAmounts] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [rawTransfers, setRawTransfers] = useState([]);

  const handlePersonChange = (index, value) => {
    const updated = [...persons];
    updated[index].name = value;
    setPersons(updated);
  };

  const addPerson = () => {
    setPersons([...persons, { id: Date.now(), name: '' }]);
  };

  const addFood = () => {
    const includedDefault = {};
    persons.forEach(p => {
      includedDefault[p.id] = true;
    });

    setFoods([
      ...foods,
      {
        id: Date.now(),
        name: '',
        cost: '',
        paidBy: persons[0]?.id || '',
        included: includedDefault
      },
    ]);
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

  // Calculate raw contributions and spending
  const calculateRawData = () => {
    // Calculate what each person should contribute per food item
    const shouldContribute = {};
    persons.forEach(p => {
      shouldContribute[p.id] = [];
    });

    foods.forEach(food => {
      const foodCost = parseFloat(food.cost) || 0;
      if (foodCost <= 0) return;

      const includedPersons = Object.entries(food.included)
        .filter(([_, v]) => v)
        .map(([id]) => id);

      if (includedPersons.length > 0) {
        const share = foodCost / includedPersons.length;
        includedPersons.forEach(id => {
          shouldContribute[id].push({
            foodId: food.id,
            foodName: food.name,
            paidById: food.paidBy,
            amount: share
          });
        });
      }
    });

    // Calculate what each person spent
    const spent = {};
    persons.forEach(p => {
      spent[p.id] = [];
    });

    foods.forEach(food => {
      const amount = parseFloat(food.cost) || 0;
      if (amount <= 0 || !food.paidBy) return;

      spent[food.paidBy].push({
        foodId: food.id,
        foodName: food.name,
        amount: amount
      });
    });

    return { shouldContribute, spent };
  };

  // Create personalized transfer lists based on raw data
  const createPersonalizedTransfers = (rawData) => {
    const { shouldContribute, spent } = rawData;
    const personTransfers = {};

    // Initialize person transfers data structure
    persons.forEach(p => {
      personTransfers[p.id] = {
        gives: [],
        takes: []
      };
    });

    // Process each person's contributions
    persons.forEach(person => {
      const personId = person.id;

      // Calculate what this person should pay to each payer
      const contributionsByPayer = {};
      shouldContribute[personId].forEach(contribution => {
        const payerId = contribution.paidById;
        if (payerId === personId) return; // Skip if paying to self

        contributionsByPayer[payerId] = (contributionsByPayer[payerId] || 0) + contribution.amount;
      });

      // Add these as "gives" transfers
      Object.entries(contributionsByPayer).forEach(([payerId, amount]) => {
        if (personId !== payerId) { // Avoid self-transfers
          personTransfers[personId].gives.push({
            to: payerId,
            amount: Math.round(amount)
          });
        }
      });

      // Calculate what this person should receive from each sharer
      const spent = foods
        .filter(food => food.paidBy === personId)
        .forEach(food => {
          const foodCost = parseFloat(food.cost) || 0;
          const includedPersons = Object.entries(food.included)
            .filter(([_, v]) => v)
            .map(([id]) => id);

          if (includedPersons.length <= 1) return; // Skip if only paid for self

          const share = foodCost / includedPersons.length;

          includedPersons.forEach(sharer => {
            if (sharer === personId) return; // Skip self

            // Add to "takes" transfers
            personTransfers[personId].takes.push({
              from: sharer,
              amount: Math.round(share)
            });
          });
        });
    });

    // Ensure transfers are reciprocal and consistent
    persons.forEach(p1 => {
      persons.forEach(p2 => {
        if (p1.id === p2.id) return;

        // Find all transfers from p1 to p2
        const p1ToP2 = personTransfers[p1.id].gives.filter(t => t.to === p2.id)
          .reduce((sum, t) => sum + t.amount, 0);

        // Find all transfers from p2 to p1
        const p2ToP1 = personTransfers[p2.id].gives.filter(t => t.to === p1.id)
          .reduce((sum, t) => sum + t.amount, 0);

        // If both have transfers to each other, net them out
        if (p1ToP2 > 0 && p2ToP1 > 0) {
          const netAmount = Math.abs(p1ToP2 - p2ToP1);

          // Clear existing transfers between these two
          personTransfers[p1.id].gives = personTransfers[p1.id].gives.filter(t => t.to !== p2.id);
          personTransfers[p2.id].gives = personTransfers[p2.id].gives.filter(t => t.to !== p1.id);
          personTransfers[p1.id].takes = personTransfers[p1.id].takes.filter(t => t.from !== p2.id);
          personTransfers[p2.id].takes = personTransfers[p2.id].takes.filter(t => t.from !== p1.id);

          // Add the net transfer
          if (p1ToP2 > p2ToP1) {
            personTransfers[p1.id].gives.push({ to: p2.id, amount: netAmount });
            personTransfers[p2.id].takes.push({ from: p1.id, amount: netAmount });
          } else if (p2ToP1 > p1ToP2) {
            personTransfers[p2.id].gives.push({ to: p1.id, amount: netAmount });
            personTransfers[p1.id].takes.push({ from: p2.id, amount: netAmount });
          }
        }
      });
    });

    // Remove self transfers
    persons.forEach(person => {
      const personId = person.id;
      personTransfers[personId].gives = personTransfers[personId].gives.filter(t => t.to !== personId);
      personTransfers[personId].takes = personTransfers[personId].takes.filter(t => t.from !== personId);
    });

    return personTransfers;
  };

  // Generate list of all transfers for the summary table
  const generateAllTransfers = (personTransfers) => {
    const allTransfers = [];

    persons.forEach(person => {
      const personId = person.id;

      personTransfers[personId].gives.forEach(transfer => {
        // Skip self transfers
        if (personId !== transfer.to) {
          allTransfers.push({
            from: personId,
            to: transfer.to,
            amount: transfer.amount
          });
        }
      });
    });

    return allTransfers;
  };

  const calculateCosts = () => {
    // Calculate each person's share based on food items
    const costs = {};
    persons.forEach(p => {
      costs[p.id] = 0;
    });

    foods.forEach(food => {
      const foodCost = parseFloat(food.cost) || 0;
      if (foodCost <= 0) return;

      const includedPersons = Object.entries(food.included)
        .filter(([_, v]) => v)
        .map(([id]) => id);

      if (includedPersons.length > 0) {
        const share = foodCost / includedPersons.length;
        includedPersons.forEach(id => {
          costs[id] = (costs[id] || 0) + share;
        });
      }
    });

    setPersonCosts(costs);

    // Calculate what each person spent
    const spent = {};
    persons.forEach(p => {
      spent[p.id] = 0;
    });

    foods.forEach(food => {
      const amount = parseFloat(food.cost) || 0;
      if (amount <= 0 || !food.paidBy) return;
      spent[food.paidBy] = (spent[food.paidBy] || 0) + amount;
    });

    // Calculate final balances (negative means they owe money, positive means they get money)
    const balances = {};
    persons.forEach(p => {
      // What they spent minus what they owe
      balances[p.id] = (spent[p.id] || 0) - (costs[p.id] || 0);
    });

    setFinalAmounts(balances);

    // Get the raw transfer data
    const rawData = calculateRawData();
    setRawTransfers(rawData);

    // Create personalized transfers
    const personTransfers = createPersonalizedTransfers(rawData);

    // Generate all transfers for the summary table
    const allTransfers = generateAllTransfers(personTransfers);
    setTransfers(allTransfers);
  };

  const getPersonById = (id) => {
    return persons.find(p => p.id == id) || { name: 'Unknown' };
  };

  // Helper to get transfers for a specific person
  const getPersonTransfers = (personId) => {
    const gives = transfers.filter(t => t.from == personId && t.to != personId)
      .map(t => ({ to: t.to, amount: t.amount }));

    const takes = transfers.filter(t => t.to == personId && t.from != personId)
      .map(t => ({ from: t.from, amount: t.amount }));

    return { gives, takes };
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-center gap-2 mb-8">
        <StickyNote className="text-indigo-700" size={32} />
        <h1 className="text-4xl font-bold text-center text-indigo-700">Hisaab By JP</h1>
      </div>

      {/* Persons */}
      <section className="space-y-3 bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus2 className="text-blue-600" />
          <h2 className="text-2xl font-semibold">Add Persons</h2>
        </div>
        {persons.map((p, i) => (
          <input
            key={p.id}
            type="text"
            placeholder={`Person ${i + 1}`}
            className="border p-3 w-full rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={p.name}
            onChange={e => handlePersonChange(i, e.target.value)}
          />
        ))}
        <button
          onClick={addPerson}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 transition-colors"
        >
          <PlusCircle size={18} /> Add Person
        </button>
      </section>

      {/* Foods */}
      <section className="space-y-4 bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="text-green-600" />
          <h2 className="text-2xl font-semibold">Add Items</h2>
        </div>
        {foods.map((food, i) => (
          <div key={food.id} className="border p-4 rounded-xl shadow bg-white space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Item Name"
                className="border p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                value={food.name}
                onChange={e => handleFoodChange(i, 'name', e.target.value)}
              />

              <div className="flex items-center border rounded-xl bg-gray-50 w-full md:w-1/3 focus-within:ring-2 focus-within:ring-green-500">
                <span className="pl-3 text-gray-500">
                  <DollarSign size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Cost"
                  className="p-3 rounded-xl w-full bg-gray-50 focus:outline-none"
                  value={food.cost}
                  onChange={e => handleFoodChange(i, 'cost', e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="font-medium w-full md:w-auto">Paid By:</div>
              <select
                className="border p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                value={food.paidBy}
                onChange={e => handleFoodChange(i, 'paidBy', e.target.value)}
              >
                <option value="">Select Person</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.name || `Person ${persons.indexOf(p) + 1}`}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Who Shared This?</p>
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
                      className="text-blue-600 focus:ring-blue-500"
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
                      className="text-red-600 focus:ring-red-500"
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
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl shadow hover:bg-green-600 transition-colors"
        >
          <PlusCircle size={18} /> Add Item
        </button>
      </section>

      {/* Calculate Button */}
      <div className="text-center">
        <button
          onClick={calculateCosts}
          className="flex items-center gap-2 mx-auto bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors text-lg font-medium"
        >
          <Calculator size={22} /> Calculate Cost
        </button>
      </div>

      {/* Final Tables */}
      {Object.keys(personCosts).length > 0 && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center text-indigo-600">Total Share & Spent</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse shadow-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-indigo-100">
                    <th className="p-4 text-left text-indigo-800 font-semibold">Name</th>
                    <th className="p-4 text-right text-indigo-800 font-semibold">Total Share</th>
                    <th className="p-4 text-right text-indigo-800 font-semibold">Amount Spent</th>
                    <th className="p-4 text-right text-indigo-800 font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, index) => {
                    const share = personCosts[p.id] || 0;
                    const totalSpent = foods
                      .filter(food => food.paidBy == p.id)
                      .reduce((sum, food) => sum + parseFloat(food.cost || 0), 0);

                    const balance = finalAmounts[p.id] || 0;

                    return (
                      <tr key={p.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="p-4 font-medium text-gray-700 border-t">{p.name || `Person ${index + 1}`}</td>
                        <td className="p-4 text-gray-700 text-right border-t">₹{share.toFixed(2)}</td>
                        <td className="p-4 text-gray-700 text-right border-t">₹{totalSpent.toFixed(2)}</td>
                        <td className={`p-4 font-semibold text-right border-t ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {balance > 0 ? `Get ₹${balance.toFixed(2)}` :
                            balance < 0 ? `Pay ₹${Math.abs(balance).toFixed(2)}` :
                              `₹0.00`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Food Items Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center text-green-600">Item Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse shadow-sm rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-green-100">
                    <th className="p-4 text-left text-green-800 font-semibold">Item</th>
                    <th className="p-4 text-right text-green-800 font-semibold">Cost</th>
                    <th className="p-4 text-left text-green-800 font-semibold">Paid By</th>
                    <th className="p-4 text-left text-green-800 font-semibold">Shared By</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((food, index) => {
                    const paidBy = getPersonById(food.paidBy);

                    const sharedByPersons = Object.entries(food.included)
                      .filter(([_, included]) => included)
                      .map(([personId]) => getPersonById(personId).name || 'Unknown')
                      .join(", ");

                    return (
                      <tr key={food.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="p-4 font-medium text-gray-700 border-t">{food.name || `Item ${index + 1}`}</td>
                        <td className="p-4 text-gray-700 text-right border-t">₹{parseFloat(food.cost || 0).toFixed(2)}</td>
                        <td className="p-4 text-gray-700 border-t">{paidBy.name || 'Unknown'}</td>
                        <td className="p-4 text-gray-700 border-t">{sharedByPersons}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Person-to-Person Payment Breakdown - Now in TABLE format */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-center text-indigo-600">Payment Breakdown</h2>

            {transfers.length > 0 ? (
              <div className="space-y-6">
                <p className="text-center text-gray-600">Here's How Everyone Should Settle Up:</p>

                <div className="space-y-8">
                  {persons.map(person => {
                    const personTransfers = getPersonTransfers(person.id);

                    if (personTransfers.gives.length === 0 && personTransfers.takes.length === 0) return null;

                    return (
                      <div key={person.id} className="border rounded-xl p-4 shadow-sm">
                        <h3 className="text-lg font-semibold mb-3">{person.name || `Person ${persons.indexOf(person) + 1}`}:</h3>
                        <table className="w-full table-auto border-collapse">
                          <tbody>
                            {personTransfers.gives.map((transfer, idx) => {
                              const toPerson = getPersonById(transfer.to);
                              return (
                                <tr key={`give-${idx}`}>
                                  <td className="py-2 text-red-600">
                                    Give ₹{transfer.amount.toFixed(2)} to {toPerson.name || 'Unknown'}
                                  </td>
                                </tr>
                              );
                            })}
                            {personTransfers.takes.map((transfer, idx) => {
                              const fromPerson = getPersonById(transfer.from);
                              return (
                                <tr key={`take-${idx}`}>
                                  <td className="py-2 text-green-600">
                                    Take ₹{transfer.amount.toFixed(2)} from {fromPerson.name || 'Unknown'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-xl font-semibold mb-4 text-center">All Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse shadow-sm rounded-xl overflow-hidden">
                      <thead>
                        <tr className="bg-indigo-100">
                          <th className="p-4 text-left text-indigo-800 font-semibold">From</th>
                          <th className="p-4 text-center text-indigo-800 font-semibold">Amount</th>
                          <th className="p-4 text-right text-indigo-800 font-semibold">To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers
                          .filter(transfer => transfer.from != transfer.to)
                          .map((transfer, index) => {
                            const from = getPersonById(transfer.from);
                            const to = getPersonById(transfer.to);

                            return (
                              <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="p-4 font-medium text-red-600 border-t">{from.name || 'Unknown'}</td>
                                <td className="p-4 font-bold text-center border-t">₹{transfer.amount.toFixed(2)}</td>
                                <td className="p-4 font-medium text-green-600 text-right border-t">{to.name || 'Unknown'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-600">No payments needed. Everyone is even!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;