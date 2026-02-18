# UberSplit

🌐 Live app  
https://evandrini.github.io/uber-split/

UberSplit is a web app that solves a very common real-world problem:  
how to split Uber rides fairly when there are multiple stops.

Most people simply split the total cost evenly, without considering that
someone who leaves earlier should not pay for the rest of the trip.
This often makes the person who lives closer pay more than they should.

UberSplit fixes that.

---

## 🚗 When should you use UberSplit?

UberSplit is typically used **after the ride is finished**.

Once you know the total fare and the route taken,
you enter the stops and who entered or left the car at each point.

The app calculates a fair split automatically.

No mental math. No awkward discussions.

---

## ⚖️ What UberSplit calculates

Each person pays only for the portion of the trip they actually used.

Calculation rules:

- A person starts paying when they enter the ride
- A person stops paying when they leave
- Shared segments are divided equally
- Individual segments are paid only by who remained
- The result clearly shows who owes whom

---

## 💡 Why this matters

Splitting “evenly” is simple, but almost always unfair.

People who leave earlier often:

- pay for distance they did not travel
- subsidize the rest of the group
- or force everyone into confusing manual calculations

UberSplit removes all of this and produces a fair result instantly.

---

## 🛠 Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS

---

## 🎯 Project goal

This project was created to solve a real everyday problem,
with focus on clear business logic, simple UX and transparent cost calculation.
