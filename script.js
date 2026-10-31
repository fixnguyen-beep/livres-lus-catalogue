
const SUPABASE_URL =
  "https://zvyialmtgfakihsezshu.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_300bZZcupRQdG97xkiCQPQ_dSCW9Xzj";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const PAGE_SIZE = 10;

let books = [];
let currentPage = 1;

const form = document.getElementById("book-form");
const list = document.getElementById("book-list");
const listMessage = document.getElementById("list-message");
const formMessage = document.getElementById("form-message");
const searchInput = document.getElementById("search");
const readerFilter = document.getElementById("filter-reader");
const previousButton = document.getElementById("previous");
const nextButton = document.getElementById("next");
const submitButton = document.getElementById("submit-button");
const dateInput = document.getElementById("date_lecture");

// Date du jour selon l'heure locale
function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

dateInput.value = today();

// Afficher une date française
function formatDate(value) {
  if (!value) return "Date inconnue";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// Nettoyer les espaces superflus
function clean(value) {
  return value.trim().replace(/\s+/g, " ");
}

// Charger les livres depuis Supabase
async function loadBooks() {
  listMessage.textContent = "Chargement des livres...";

  try {
    const allBooks = [];
    const batchSize = 500;
    let start = 0;

    while (true) {
      const { data, error } = await db
        .from("livres_lus")
        .select(
          "id, lecteur, titre, auteur, date_lecture, created_at"
        )
        .order("date_lecture", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, start + batchSize - 1);

      if (error) throw error;

      allBooks.push(...data);

      if (data.length < batchSize) break;

      start += batchSize;
    }

    books = allBooks;
    listMessage.textContent = "";
    renderBooks();

  } catch (error) {
    console.error(error);
    listMessage.textContent =
      "Impossible de charger les livres : " + error.message;
    list.replaceChildren();
  }
}

// Filtrer les livres
function filteredBooks() {
  const query = searchInput.value
    .trim()
    .toLocaleLowerCase("fr");

  const reader = readerFilter.value;

  return books.filter(book => {
    const title = (book.titre || "")
      .toLocaleLowerCase("fr");

    const author = (book.auteur || "")
      .toLocaleLowerCase("fr");

    const matchesSearch =
      title.includes(query) || author.includes(query);

    const matchesReader =
      !reader || book.lecteur === reader;

    return matchesSearch && matchesReader;
  });
}

// Créer un élément texte sans HTML injecté
function textElement(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value ?? "";
  return element;
}

// Afficher les livres
function renderBooks() {
  const filtered = filteredBooks();

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(
    start,
    start + PAGE_SIZE
  );

  list.replaceChildren();

  document.getElementById("book-count").textContent =
    `${filtered.length} livre(s)`;

  if (visible.length === 0) {
    list.appendChild(
      textElement(
        "p",
        "empty",
        "Aucun livre trouvé."
      )
    );
  }

  for (const book of visible) {
    const card = document.createElement("article");
    card.className = "book";

    card.appendChild(
      textElement("h3", "title", book.titre)
    );

    card.appendChild(
      textElement("p", "author", book.auteur)
    );

    card.appendChild(
      textElement(
        "p",
        "meta",
        `${book.lecteur} · ${formatDate(book.date_lecture)}`
      )
    );

    list.appendChild(card);
  }

  document.getElementById("page-info").textContent =
    `Page ${currentPage} / ${totalPages}`;

  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
}

// Recherche et filtres
searchInput.addEventListener("input", () => {
  currentPage = 1;
  renderBooks();
});

readerFilter.addEventListener("change", () => {
  currentPage = 1;
  renderBooks();
});

// Pagination
previousButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderBooks();
  }
});

nextButton.addEventListener("click", () => {
  currentPage++;
  renderBooks();
});

// Ajouter un livre
form.addEventListener("submit", async event => {
  event.preventDefault();

  const lecteur = clean(
    document.getElementById("lecteur").value
  );

  const titre = clean(
    document.getElementById("titre").value
  );

  const auteur = clean(
    document.getElementById("auteur").value
  );

  const date_lecture = dateInput.value;

  if (!lecteur || !titre || !auteur || !date_lecture) {
    formMessage.textContent =
      "Merci de remplir tous les champs.";
    return;
  }

  if (
    lecteur.length > 100 ||
    titre.length > 300 ||
    auteur.length > 200
  ) {
    formMessage.textContent =
      "Un des champs dépasse la longueur autorisée.";
    return;
  }

  submitButton.disabled = true;
  formMessage.textContent = "Enregistrement...";

  try {
    const { error } = await db
      .from("livres_lus")
      .insert([{
        lecteur,
        titre,
        auteur,
        date_lecture
      }]);

    if (error) throw error;

    form.reset();
    dateInput.value = today();

    formMessage.textContent =
      "Le livre a bien été ajouté !";

    currentPage = 1;
    await loadBooks();

  } catch (error) {
    console.error(error);

    formMessage.textContent =
      "Erreur lors de l'ajout : " + error.message;

  } finally {
    submitButton.disabled = false;
  }
});

// Démarrage
if (
  SUPABASE_KEY === "COLLER_ICI_TA_CLE_PUBLIQUE"
) {
  listMessage.textContent =
    "Configure d'abord ta clé publique Supabase dans script.js.";
} else {
  loadBooks();
}
