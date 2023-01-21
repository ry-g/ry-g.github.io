# MusicalNetwork
> Music discovery through audio feature exploration


## DESCRIPTION

MusicalNetwork is an interactive environment for the spatial exploration of music. On first use of the application, you will see a control panel and several hundred colored nodes. Each node represents an audio track that can be moved, clicked, and hovered over to see more details. 

Each node is assigned to a group, nodes of the same group will share the same color and be clustered closely together. These groups have been precomputed in python and are based on communities found through label propagation. The underlying undirected graph was constructed by assigning edges to the 5 nearest neighbors based on Euclidean distance between each track's audio features (acousticness, danceability, energy, instrumentalness, liveness, speechiness, valence, loudness, tempo, duration_ms, key, mode). 

The size of each node is a function of the cosine similarity between its audio features and the currently selected Feature Slider values. In the control panel, clicking on "Feature Sliders" will open a drop-down showing all presently selected values. Changing these values changes both the size of the nodes on the screen as well as which nodes are displayed. The first slider controls how many nodes are displayed on the screen. The top "Maximum Tracks Displayed" number of nodes will be displayed based on their similarity to the slider values.

The Additional panels, "Track Info" and "Radar Chart" will provide additional details and visuals pertaining to a selected track, as well as a 30-second audio sample if available. At the bottom of the control panel, you will see a few additional features which allow for the simulation to be reset or paused, and more notably, a track filter mode and a track merger tool. In filter mode, sliders are used as thresholds, meaning no nodes with values less than those of the sliders will be displayed. The merge tool becomes activate after freezing 1 or more nodes by dragging and dropping them in a new location. Clicking the merge tool with tracks selected will open a new visualization that displays a stacked radar chart of the selected nodes' values and an option to set the sliders to the average of these values. 

## INSTALLATION

> Note: these steps are **not** required to view a demo of the project. See the [project demo site](https://ryg.me/) for an immediate view.

### 0. Prerequisites  
To run the code in its entirety, two accounts will be needed:
- A [Kaggle account](https://www.kaggle.com/) to obtain the data used throughout the application
- A Spotify account to enable queries to the [Spotify API](https://developer.spotify.com/documentation/web-api/quick-start/)

#### Dependencies
The following python libraries are required:
```
pandas        1.2.4
Spotipy       2.17.1
scikit-learn  0.24.1
networkx      2.5
tqdm          4.60.0
pyarrow       3.0.0
```

### 1. Obtain the Data

To run the small-scale version of the analysis, the [Spotify Dataset 160k Tracks](https://www.kaggle.com/yamaerenay/spotify-dataset-19212020-160k-tracks?select=data_o.csv) dataset is required. Note: The dataset was altered in April 2021 to include a new set of 600k tracks. The small-scale dataset used in this analysis uses the previous version of this dataset, now included as `data_o.csv`. After downloading this file, rename it to `data.csv`, create a directory called `data` in the `scripts` directory, and place `data.csv` in `scripts/data`.

To run the full-scale version of the analysis, download the [Spotify 1.2M+ Songs](https://www.kaggle.com/rodolfofigueroa/spotify-12m-songs?select=tracks_features.csv) dataset, rename it `data1m.csv` and place it in the `scripts/data` directory. You should now have two datasets in the directory and you can proceed to the next step.

### 2. Gather Supplemental Data with Spotipy

Open the file `query_spotify.py` and enter your client id, client secret, and redirect URL in the `CLIENT_ID`, `CLIENT_SECRET`, and `REDIRECT_URI` variables respectively. Save the file and execute the following command to query the Spotify API for track information: `python query_spotify.py`. Once completed, you will have a file named `raw_full.df` and you can proceed to the next step.

### 3. Calculate Groups

If using the full dataset open `process.py` and change the variable `USE_LARGE_DATASET` to `True`. Otherwise, proceed to execute the script by calling `python process.py`. Once complete, you will have a file called `samp_pop50.csv` in your directory, this can optionally be placed in the `musicalnetwork/data/` directory to overwrite the current file.

You may now proceed to Execution - Run from Source.

## EXECUTION

### Demo

To run a demo of the application, the simplest method is to navigate to the project demo site: https://ryg.me/

Here you will see a fully operational demo of the project. No additional setup is required.

### Run from Source

Running the demo from the source code assumes that you have completed all steps in the Installation section. 

Once all requisite steps have been completed, navigate the `musicalnetwork` directory and cal
