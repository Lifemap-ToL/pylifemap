library(arrow)

lmdata_url <- url("https://lifemap.univ-lyon1.fr/data/lmdata.Rdata")


load(lmdata_url) # DF
arrow::write_parquet(DF, "scripts/data/lmdata_raw.parquet")
