document.addEventListener("DOMContentLoaded", async () => {
  const supabaseUrl = 'https://ydeczzyvfgwwmfornfef.supabase.co';
  // Keep this project-matched anon key in sync with the other DAUUZ pages.
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZWN6enl2Zmd3d21mb3JuZmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Njc1ODksImV4cCI6MjA4MzU0MzU4OX0.IBNkcqDJtQSurdKaic94iRrc4NYnO8m1e1bQzbkkstc";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const showLoadError = (message) => {
    console.error(message);
    const usernameDisplay = document.getElementById("username-display");
    if (usernameDisplay) usernameDisplay.textContent = "Profile unavailable";
    const balanceDisplay = document.getElementById("balance");
    if (balanceDisplay) balanceDisplay.textContent = "Unable to load";
  };

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) { window.location.href = "login.html"; return; }
    const userId = session.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("username, balance").eq("id", userId).single();
    if (profileError) throw profileError;
    if (!profile) throw new Error("No profile row found for the authenticated user.");

    const usernameDisplay = document.getElementById("username-display");
    const balanceDisplay = document.getElementById("balance");
    const modal = document.getElementById("profile-modal");
    const profileForm = document.getElementById("profile-form");
    const usernameInput = document.getElementById("profile-username");
    const message = document.getElementById("profile-message");
    const saveButton = document.getElementById("profile-save-btn");

    usernameDisplay.textContent = profile.username || "User";
    balanceDisplay.textContent = (Number(profile.balance) || 0).toFixed(4) + " DUZ";
    usernameInput.value = profile.username || "";

    const closeModal = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); };
    document.getElementById("edit-profile-btn").addEventListener("click", () => {
      usernameInput.value = usernameDisplay.textContent;
      message.textContent = ""; message.className = "profile-message";
      modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
      usernameInput.focus();
    });
    modal.querySelectorAll("[data-close-profile]").forEach(el => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", e => { if(e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      const username = usernameInput.value.trim();
      if(username.length < 3 || username.length > 30) {
        message.textContent = "Username must be between 3 and 30 characters."; return;
      }
      if(username === usernameDisplay.textContent) { closeModal(); return; }
      saveButton.disabled = true; saveButton.textContent = "Saving…";
      message.textContent = ""; message.className = "profile-message";
      const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);
      saveButton.disabled = false; saveButton.innerHTML = 'Save changes <span>→</span>';
      if(error) {
        console.error("Profile update failed:", error);
        message.textContent = "Could not update your profile. Please try again.";
        return;
      }
      usernameDisplay.textContent = username;
      message.textContent = "Your username has been updated.";
      message.className = "profile-message success";
      setTimeout(closeModal, 900);
    });

    const { data: tasks, error: taskError } = await supabase
      .from("tasks").select("task_type, status, reward").eq("user_id", userId);
    if (taskError) {
      console.error("Failed to load tasks:", taskError);
      return;
    }

    const pendingList = document.getElementById("pending-list");
    const completedList = document.getElementById("completed-list");
    pendingList.innerHTML = ""; completedList.innerHTML = "";
    (tasks || []).forEach(task => {
      if (task.status === "pending") {
        const li = document.createElement("li");
        li.textContent = `${task.task_type} : waiting approval`;
        pendingList.appendChild(li);
      } else if (task.status === "approved") {
        const li = document.createElement("li");
        li.textContent = `${task.task_type} : +${task.reward} DUZ`;
        completedList.appendChild(li);
      }
    });
  } catch (error) {
    showLoadError("Dashboard data loading failed: " + (error?.message || error));
  }
});