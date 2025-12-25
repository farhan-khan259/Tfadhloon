

window.voiceChatInitialized = window.voiceChatInitialized || false;

if (!window.voiceChatInitialized) {
  window.voiceChatInitialized = true;

 
  window.localStream = null;
  let peer = null;
  let callConnections = {};
  let isMuted = false; 


const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code"); 
if (!code) {
  alert("No game code found in URL!");
}
const roomId = code; 
const db = firebase.database();


  const micBtn = document.getElementById("micBtn");
  const micIcon = document.getElementById("micIcon");

  if (!micBtn || !micIcon) {
    console.error("Mic button or icon element not found!");
  } else {
    micBtn.disabled = true;


    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.localStream = stream;

        window.localStream.getAudioTracks()[0].enabled = true;
        micBtn.disabled = false;
        micIcon.className = "bi bi-mic-fill";

        console.log("Mic ready:", window.localStream);


        micBtn.addEventListener("click", () => {
          if (!window.localStream) return;
          isMuted = !isMuted;
          window.localStream.getAudioTracks()[0].enabled = !isMuted;
          micIcon.className = isMuted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
          console.log(
            "Mic muted:", isMuted,
            "Track enabled:", window.localStream.getAudioTracks()[0].enabled
          );
        });

      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Please allow microphone access to use voice chat!");
      }
    }

    function initPeer() {
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:numb.viagenie.ca',
              credential: 'muazkh',
              username: 'webrtc@live.com'
            }
          ]
        }
      });

      peer.on("open", id => {
        console.log("My Peer ID:", id);
        localStorage.setItem("myPeerId", id);

        const roomRef = db.ref("rooms/" + roomId + "/peers");

       
        roomRef.remove().then(() => {
          roomRef.child(id).set(true);
        });

        peer.on("disconnected", () => roomRef.child(id).remove());

        listenForPeers(roomRef, id);
      });

      peer.on("call", call => {
        console.log("📞 Incoming call from", call.peer);

        if (window.localStream) {
          call.answer(window.localStream);
        } else {
          initMic().then(() => call.answer(window.localStream));
        }

        callConnections[call.peer] = call;
        call.on("stream", playRemoteStream);

        call.on("close", () => {
          delete callConnections[call.peer];
        });
      });
    }


    function listenForPeers(roomRef, myId) {
      roomRef.on("value", snapshot => {
        const peers = snapshot.val() || {};

        Object.keys(callConnections).forEach(pid => {
          if (!peers[pid]) {
            callConnections[pid].close();
            delete callConnections[pid];
          }
        });

  
        Object.keys(peers).forEach(pid => {
          if (pid !== myId && !callConnections[pid]) {
            console.log(" Connecting to online peer:", pid);
            connectToPeer(pid);
          }
        });
      });
    }

    
    function connectToPeer(peerId) {
      if (!peerId || !window.localStream) return;

      console.log("Calling peer:", peerId);
      const call = peer.call(peerId, window.localStream);
      callConnections[peerId] = call;

      call.on("stream", stream => {
        console.log("Remote stream received from peer:", peerId, stream);
        playRemoteStream(stream);
      });

      call.on("close", () => {
        delete callConnections[peerId];
      });
    }

    function playRemoteStream(stream) {
      const audio = document.createElement("audio");
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.controls = false;
      audio.volume = 1.0;
      audio.muted = false;
      audio.style.display = "none";
      document.body.appendChild(audio);

      audio.play().catch(() => {
        console.log("Autoplay blocked. Tap anywhere to start audio.");
        document.body.addEventListener('click', () => audio.play(), { once: true });
      });
    }

    // ======== Cleanup old peer on tab close ========
    window.addEventListener("beforeunload", () => {
      const myId = localStorage.getItem("myPeerId");
      if (myId) db.ref("rooms/" + roomId + "/peers/" + myId).remove();
    });



    const speakerBtn = document.getElementById("speakerBtn");
const speakerIcon = document.getElementById("speakerIcon");

let isSpeakerMuted = false;  
const remoteAudios = [];    

function playRemoteStream(stream) {
  const audio = document.createElement("audio");
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.controls = false;
  audio.volume = 1.0;
  audio.muted = isSpeakerMuted;
  audio.style.display = "none";
  document.body.appendChild(audio);

  remoteAudios.push(audio); 

  audio.play().catch(() => {
    document.body.addEventListener('click', () => audio.play(), { once: true });
  });
}


if (speakerBtn && speakerIcon) {
  speakerBtn.addEventListener("click", () => {
    isSpeakerMuted = !isSpeakerMuted;
    speakerIcon.className = isSpeakerMuted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";


    remoteAudios.forEach(a => a.muted = isSpeakerMuted);

    console.log("Speaker muted:", isSpeakerMuted);
  });
}

    // ======== Initialize everything ========
    document.addEventListener("DOMContentLoaded", () => {
      initMic().then(initPeer);
    });
  }
}
