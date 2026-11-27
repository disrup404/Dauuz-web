document.addEventListener("DOMContentLoaded", async () => {
  const supabaseUrl = "https://ydeczzyvfgwwmfornfef.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZWN6enl2Zmd3bWZvcm5mZWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2Nzk2NzU4OSwiZXhwIjoyMDgzNTQzNTg5fQ.IBNkcqDJtQSurdKaic94iRrc4NYnO8m1e1bQzbkkstc";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const dashboard = document.querySelector(".dashboard");
  function showNotice(text, type = "error") {
    let notice = document.getElementById("dashboard-data-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "dashboard-data-notice";
      notice.setAttribute("role", "status");
      notice.style.cssText = "margin:0 0 22px;padding:14px 16px;border:1px solid #765d39;border-radius:10px;background:#211c14;color:#f0cc8c;font-size:14px;line-height:1.5";
      dashboard.prepend(notice);
    }
    notice.textContent = text;
    notice.dataset.type = type;
  }
  function clearNotice() {
    document.getElementById("dashboard-data-notice")?.remove();
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("Could not check your login session: " + sessionError.message);
    const session = sessionData?.session;
    if (!session) {
      window.location.href = "login.html";
      return;
    }
    const userId = session.user.id;

    const usernameDisplay = document.getElementById("username-display");
    const balanceDisplay = document.getElementById("balance");
    const pendingList = document.getElementById("pending-list");
    const completedList = document.getElementById("completed-list");
    const modal = document.getElementById("profile-modal");
    const profileForm = document.getElementById("profile-form");
    const usernameInput = document.getElementById("profile-username");
    const message = document.getElementById("profile-message");
    const saveButton = document.getElementById("profile-save-btn");

    // Load profile independently so a task-history error cannot hide account data.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, balance")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Dashboard profile query failed:", profileError);
      showNotice("Your account is signed in, but profile data could not be loaded: " + profileError.message);
    } else if (!profile) {
      showNotice("Your account is signed in, but no matching profile record was found. Please contact support so the profile can be checked.");
    } else {
      usernameDisplay.textContent = profile.username || "User";
      const balance = Number(profile.balance);
      balanceDisplay.textContent = (Number.isFinite(balance) ? balance : 0).toFixed(4) + " DUZ";
      usernameInput.value = profile.username || "";
      clearNotice();
    }

    const closeModal = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    };
    document.getElementById("edit-profile-btn").addEventListener("click", () => {
      usernameInput.value = usernameDisplay.textContent === "User" ? "" : usernameDisplay.textContent;
      message.textContent = "";
      message.className = "profile-message";
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      usernameInput.focus();
    });
    modal.querySelectorAll("[data-close-profile]").forEach(el => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });

    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      const username = usernameInput.value.trim();
      if (username.length < 3 || username.length > 30) {
        message.textContent = "Username must be between 3 and 30 characters.";
        return;
      }
      if (username === usernameDisplay.textContent) {
        closeModal();
        return;
      }
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
      message.textContent = "";
      message.className = "profile-message";
      const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);
      saveButton.disabled = false;
      saveButton.innerHTML = 'Save changes <span>→</span>';
      if (error) {
        console.error("Profile update failed:", error);
        message.textContent = "Could not update your profile: " + error.message;
        return;
      }
      usernameDisplay.textContent = username;
      message.textContent = "Your username has been updated.";
      message.className = "profile-message success";
      setTimeout(closeModal, 900);
    });

    // Load task activity separately; report errors without aborting the profile view.
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("task_type, status, reward")
      .eq("user_id", userId);

    pendingList.innerHTML = "";
    completedList.innerHTML = "";
    if (taskError) {
      console.error("Dashboard task query failed:", taskError);
      showNotice("Your profile is loaded, but contribution history could not be loaded: " + taskError.message);
      pendingList.textContent = "Unable to load pending contributions.";
      completedList.textContent = "Unable to load completed contributions.";
      return;
    }

    (tasks || []).forEach(task => {
      if (task.status === "pending") {
        const li = document.createElement("li");
        li.textContent = `${task.task_type || "Contribution"} : waiting approval`;
        pendingList.appendChild(li);
      } else if (task.status === "approved") {
        const li = document.createElement("li");
        li.textContent = `${task.task_type || "Contribution"} : +${task.reward ?? 0} DUZ`;
        completedList.appendChild(li);
      }
    });
    if (!pendingList.children.length) pendingList.textContent = "No contributions awaiting review.";
    if (!completedList.children.length) completedList.textContent = "No approved contributions yet.";
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    showNotice("Dashboard could not load: " + (error?.message || "Unexpected error. Please refresh and try again."));
  }
});