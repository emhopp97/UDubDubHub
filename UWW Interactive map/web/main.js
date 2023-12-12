const bounds = L.latLngBounds([[42.8182,-88.7713],[42.8579,-88.6857]]);
const whitewaterBounds = L.latLngBounds([[42.8338449,-88.7261944],[42.8499342,-88.7603279]]);
const bounds3 = L.latLngBounds([[42.8514975,-88.7575875],[42.8337837,-88.7282518]]);
const map = L.map('map', {
    zoomControl: false,
    maxBounds: bounds3,
    minZoom: 16,
    maxBoundsViscosity: 1.0
}).setView([42.84239936692087, -88.74296469067717], 16);
// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 18,
//     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);
L.tileLayer('./tiles/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


L.control.zoom({position: "topright"}).addTo(map);

const shadow = document.getElementById("shadow");
const mapKeys = document.getElementById("keys");
const groups = [];
fetch(".\\buildings.json", {method: "GET"})
    .then((response) => response.json())
    .then((json) => json.groups.forEach(group => {
        const g = group;
        group.members.forEach(member => {
            const poly = L.polygon(member.polys).addTo(map);
            delete member.polys;
            const m = member;

            //each building should get a label.
            // L.marker(poly.getCenter(), {
            //     icon: L.divIcon({
            //         className: 'text-labels',
            //         html: member.name
            //     }),
            //     zIndexOffset: 1000
            // }).addTo(map);

            //create info element before popup.
            member.infoBox = document.createElement("div");
            member.infoBox.classList.add("infobox");
            const infoTitle = document.createElement("p");
            infoTitle.innerText = member.name;
            member.infoBox.appendChild(infoTitle);
            const infoClose = document.createElement("a");
            infoClose.innerText = "x";
            infoClose.href = "javascript:void(0);";
            infoClose.addEventListener("click", (e) => {
                shadow.style.visibility = "hidden";
                m.infoBox.style.visibility = "hidden";
            });
            member.infoBox.appendChild(infoClose);
            const infoNav = document.createElement("div");
            const infoNavList = document.createElement("ul");
            const infoNavTab = document.createElement("li");
            infoNavTab.classList.add("activeTab");
            infoNavTab.innerText = "Info";
            infoNavList.appendChild(infoNavTab);
            infoNav.appendChild(infoNavList);
            const infoNavContent = document.createElement("div");
            const infoNavLabel = document.createElement("p");
            infoNavLabel.innerText = "Street Address:";
            infoNavContent.appendChild(infoNavLabel);
            const infoNavAddr = document.createElement("p");
            infoNavAddr.innerText = member.addr;
            infoNavContent.appendChild(infoNavAddr);
            infoNav.appendChild(infoNavContent);
            member.infoBox.appendChild(infoNav);
            const infoTabBottom = document.createElement("div");
            infoTabBottom.innerText = "Placeholder text";
            member.infoBox.appendChild(infoTabBottom);
            member.infoBox.style.visibility = "hidden";
            document.body.appendChild(member.infoBox);

            const popup = new L.Popup();
            popup.setContent(
                "<div>"+
                    (member.img? ("<img src='"+member.img+"'/>"): "")+
                    "<div>"+
                        "<p>"+member.name+"</p>"+
                        "<p>"+member.addr+"</p>"+
                    "</div>"+
                "</div>"+
                "<a onclick='showInfo(\""+g.name+"\",\""+member.name+"\")' href='javascript:void(0);'>More >></a>");
            
            poly
                .setStyle(g.style)
                .bindPopup(popup)
                .on("click", (e) => poly.setStyle(g.selectedStyle))
                .getPopup().on("remove", (e) => poly.setStyle(g.style));
            member.poly = poly;

            member.searchResult = document.createElement("li");
            member.searchResult.classList.add("result");
            member.searchResult.innerText = member.name;
            member.searchResult.addEventListener("click", (e) => {
                map.panTo(member.poly.getCenter());
                member.poly.setStyle(g.selectedStyle);
                member.poly.openPopup();
            });
        });

        const colorBlockTd = document.createElement("td");
        colorBlockTd.classList.add("mapColor");
        colorBlockTd.style.backgroundColor = g.style.fillColor;
        const keyRow = document.createElement("tr");
        keyRow.appendChild(colorBlockTd);
        const keyValueTd = document.createElement("td");
        keyValueTd.innerText = g.name;
        keyRow.appendChild(keyValueTd);
        mapKeys.appendChild(keyRow);

        g.categoryHeader = document.createElement("li");
        g.categoryHeader.classList.add("category");
        g.categoryHeader.innerText = g.name;

        groups.push(g);
    }));

const greyout = document.getElementById("greyout");
const searchResults = document.getElementById("results");
const searchBar = document.getElementById("terms");
searchBar.addEventListener("focus", (evt) => {
    searchResults.style.visibility = "visible";
    greyout.style.visibility = "visible";
});
searchBar.addEventListener("focusout", (evt) => {
    setTimeout(() => {
        searchResults.style.visibility = "hidden";
        greyout.style.visibility = "hidden";
    }, 300);
});
searchBar.addEventListener("input", (evt) => {
    const query = searchBar.value.toLowerCase();
    const terms = query.split(" ");
    const results = [];
    groups.forEach((group) => {
        const g = {
            name: group.name,
            selectedStyle: group.selectedStyle,
            categoryHeader: group.categoryHeader,
            members: []
        };
        group.members.forEach(member => {
            for(let i = 0; i < terms.length; i++)
                if(member.name.toLowerCase().includes(terms[i])) {
                    member.dist = editDistance(query, member.name.toLowerCase());
                    g.members.push(member);
                    break;
                }
        });
        if(g.members.length == 0)
            return;
        g.members.sort((a,b) => a.dist - b.dist);
        results.push(g);
    });

    results.sort((a,b) => a.members[0].dist - b.members[0].dist);
    searchResults.innerHTML = "";
    results.forEach(group => {
        const g = group;
        searchResults.appendChild(g.categoryHeader);
        g.members.forEach((member) => {
            delete member.dist;
            searchResults.appendChild(member.searchResult);
        });
    });
});

function editDistance(str1, str2) {
    let prevGen = new Int32Array(str2.length);
    let currGen = new Int32Array(str2.length);
    const lastFirst = str1.charAt(str1.length - 1);
    const lastSecond = str2.charAt(str2.length - 1);
    currGen[str2.length - 1] = (lastFirst == str2.charAt(str2.length - 1)? 0: 1);
    for(let c = str2.length - 2; c >= 0; c--)
        currGen[c] = (lastFirst == str2.charAt(c)? -1: 0) + str2.length - c;

    for(let r = str1.length - 2; r >= 0; r--) {
        const currChar = str1.charAt(r);
        let tmp = prevGen;
        prevGen = currGen;
        currGen = tmp;
        currGen[str2.length - 1] = (currChar == lastSecond? -1: 0) + str1.length - r;
        for(let c = str2.length - 2; c >= 0; c--)
            currGen[c] = Math.min(
                (currChar == str2.charAt(c)? 0: 1) + prevGen[c+1],
                1 + prevGen[c],
                1 + currGen[c + 1]);
    }

    return currGen[0];
}

//o(n) searching is fine here, this function will not be called that often.
function showInfo(category, member) {
    shadow.style.visibility = "visible";
    let cat = undefined;
    for(let i = 0; i < groups.length; i++)
        if(groups[i].name == category) {
            cat = groups[i].members;
            console.log(cat);
            break;
        }
    for(let i = 0; i < cat.length; i++)
        if(cat[i].name == member) {
            cat[i].infoBox.style.visibility = "visible";
            return;
        }
}